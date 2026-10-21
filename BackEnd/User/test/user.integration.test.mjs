import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
test("User API dependency readiness, authenticated profiles, and OTP verification", { skip: process.env.RUN_API_TESTS !== "1", timeout: 60000 }, async () => {
  const { AppDataSource: db, initializeDatabase, User, generateToken } = await import("@zenchat/database");
  const { redisClient: redis } = await import("../dist/config/redis.js");
  const { digest } = await import("../dist/services/otp.js");
  await initializeDatabase();
  await redis.connect();
  const user = await db.getRepository(User).save({ name: "User API fixture", email: randomUUID() + "@example.invalid" });
  const token = generateToken(user);
  const key = "otp:" + user.email;
  let output = "";
  const child = spawn(process.execPath, ["--max-old-space-size=512", "dist/index.js"], {
    env: { ...process.env, PORT: "5110" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  child.stdout.on("data", value => { output = (output + value).slice(-3000); });
  child.stderr.on("data", value => { output = (output + value).slice(-3000); });
  const request = (path, auth, body) => fetch("http://localhost:5110/api/v1/user" + path, {
    method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error("User child exited: " + output);
      try { ready = (await fetch("http://localhost:5110/health/ready", { signal: AbortSignal.timeout(1000) })).ok; } catch {}
      if (ready) break;
      await sleep(200);
    }
    assert.equal(ready, true, output);
    assert.equal((await request("/me")).status, 401);
    const profile = await (await request("/me", token)).json();
    assert.equal(profile._id, user.id);
    assert.equal((await request("/login", null, { email: "invalid" })).status, 400);
    await redis.set(key, JSON.stringify({ digest: digest(user.email, "123456"), attempts: 0, requestId: "fixture" }), { EX: 30 });
    const verified = await request("/verify", null, { email: user.email, otp: "123456" });
    assert.equal(verified.status, 200);
    const data = await verified.json();
    assert.equal(data.user._id, user.id);
    assert.ok(data.token);
    assert.equal((await request("/verify", null, { email: user.email, otp: "123456" })).status, 400);
    const updated = await (await request("/update/user", data.token, { name: "Updated fixture" })).json();
    assert.equal(updated.user.name, "Updated fixture");
    assert.equal((await (await request("/me", updated.token)).json()).name, "Updated fixture");
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit").catch(() => {}), sleep(5000)]);
    await redis.del(key); redis.destroy();
    await db.getRepository(User).delete({ id: user.id });
    await db.destroy();
  }
});

