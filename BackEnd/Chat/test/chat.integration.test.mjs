import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { once } from "node:events";
import { io } from "socket.io-client";

test("authenticated chat, membership, pagination, receipts, and socket delivery", { skip: process.env.RUN_DB_TESTS !== "1", timeout: 60000 }, async () => {
  const { AppDataSource: db, initializeDatabase, User, Conversation, ConversationMember, Message, generateToken } = await import("@zenchat/database");
  await initializeDatabase();
  const fixtures = await db.getRepository(User).save(["Alice", "Bob", "Eve"].map(name => ({ name, email: randomUUID() + "@example.invalid" })));
  const [alice, bob, eve] = fixtures;
  const tokens = fixtures.map(generateToken);
  const origin = "http://localhost:5111";
  const sockets = [];
  const chatIds = new Set();
  let output = "";
  const child = spawn(process.execPath, ["--max-old-space-size=512", "dist/index.js"], {
    env: { ...process.env, PORT: "5111" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  child.stdout.on("data", data => { output = (output + data).slice(-4000); });
  child.stderr.on("data", data => { output = (output + data).slice(-4000); });
  const request = (path, token, body) => fetch(origin + "/api/v1/chat" + path, {
    method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  });
  const connect = token => new Promise((resolve, reject) => {
    const socket = io(origin, { auth: { token }, transports: ["websocket"], reconnection: false, timeout: 5000, forceNew: true });
    sockets.push(socket);
    socket.once("connect", () => resolve(socket)); socket.once("connect_error", reject);
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error("Chat child exited: " + output);
      try { ready = (await fetch(origin + "/health/ready", { signal: AbortSignal.timeout(1000) })).ok; } catch {}
      if (ready) break;
      await sleep(200);
    }
    assert.equal(ready, true, output);
    assert.equal((await request("/all", "invalid")).status, 401);
    const created = await Promise.all([request("/new", tokens[0], { otherUserId: bob.id }), request("/new", tokens[0], { otherUserId: bob.id })]);
    const ids = await Promise.all(created.map(async response => { assert.equal(response.status, 201); const body = await response.json(); chatIds.add(body.chatId); return body.chatId; }));
    assert.equal(ids[0], ids[1]);
    const chatId = ids[0];
    assert.equal(await db.getRepository(ConversationMember).countBy({ conversationId: chatId }), 2);
    assert.equal((await request("/message/" + chatId, tokens[2])).status, 403);
    const socketA = await connect(tokens[0]); const socketB = await connect(tokens[1]); const socketE = await connect(tokens[2]);
    const denied = await socketE.timeout(3000).emitWithAck("joinChat", chatId);
    assert.equal(denied.ok, false);
    const receivedA = []; const receivedB = [];
    socketA.on("newMessage", message => receivedA.push(message));
    socketB.on("newMessage", message => receivedB.push(message));
    const response = await request("/message", tokens[0], { chatId, text: "Hello integration test" });
    assert.equal(response.status, 201);
    const { message } = await response.json();
    await sleep(200);
    assert.equal(receivedA.filter(item => item._id === message._id).length, 1);
    assert.equal(receivedB.filter(item => item._id === message._id).length, 1);
    assert.equal(message.seen, false);
    const read = await request("/message/" + chatId, tokens[1]);
    assert.equal(read.status, 200);
    assert.equal((await db.getRepository(Message).findOneByOrFail({ id: message._id })).seen, true);
    await db.getRepository(Message).save(Array.from({ length: 55 }, (_, index) => ({
      conversationId: chatId, senderId: alice.id, text: "History " + index,
    })));
    const firstPage = await (await request("/message/" + chatId, tokens[1])).json();
    assert.equal(firstPage.messages.length, 50);
    assert.ok(firstPage.nextCursor);
    const nextPage = await (await request("/message/" + chatId + "?before=" + encodeURIComponent(firstPage.nextCursor), tokens[1])).json();
    assert.equal(nextPage.messages.length, 6);
    assert.equal(new Set([...firstPage.messages, ...nextPage.messages].map(item => item._id)).size, 56);
    assert.equal((await request("/message", tokens[2], { chatId, text: "Unauthorized" })).status, 403);
    const joined = await socketB.timeout(3000).emitWithAck("joinChat", chatId);
    assert.equal(joined.ok, true);
    const seen = await (await request("/message", tokens[0], { chatId, text: "Read immediately" })).json();
    assert.equal(seen.message.seen, true);
    const list = await (await request("/all", tokens[0])).json();
    assert.equal(list.chats[0].user._id, bob.id);
    assert.equal(list.chats[0].chat.latestMessage.text, "Read immediately");
  } finally {
    sockets.forEach(socket => socket.disconnect());
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit").catch(() => {}), sleep(5000)]);
    // Remove only fixture conversations and users, never existing user data.
    for (const id of chatIds) await db.getRepository(Conversation).delete({ id });
    for (const user of fixtures) await db.getRepository(User).delete({ id: user.id });
    await db.destroy();
  }
});

