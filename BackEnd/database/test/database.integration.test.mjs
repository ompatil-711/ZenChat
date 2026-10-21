import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("PostgreSQL migration, FK/content constraints, and rollback", { skip: process.env.RUN_DB_TESTS !== "1" }, async () => {
  const { initializeDatabase, AppDataSource, User, Conversation, ConversationMember, Message } = await import("../dist/index.js");
  await initializeDatabase();
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const first = await runner.manager.save(User, { email: randomUUID() + "@example.invalid", name: "Test A" });
    const second = await runner.manager.save(User, { email: randomUUID() + "@example.invalid", name: "Test B" });
    const conversation = await runner.manager.save(Conversation, { directKey: [first.id, second.id].sort().join(":") });
    await runner.manager.save(ConversationMember, { conversationId: conversation.id, userId: first.id });
    const message = await runner.manager.save(Message, { conversationId: conversation.id, senderId: first.id, text: "Transaction fixture" });
    assert.equal((await runner.manager.findOneByOrFail(Message, { id: message.id })).text, "Transaction fixture");
    await runner.query("SAVEPOINT invalid_sender");
    await assert.rejects(runner.manager.save(Message, { conversationId: conversation.id, senderId: second.id, text: "Not a member" }), e => e.code === "23503");
    await runner.query("ROLLBACK TO SAVEPOINT invalid_sender");
    await runner.query("SAVEPOINT empty_message");
    await assert.rejects(runner.manager.save(Message, { conversationId: conversation.id, senderId: first.id, text: " " }), e => e.code === "23514");
    await runner.query("ROLLBACK TO SAVEPOINT empty_message");
    await runner.query("SAVEPOINT duplicate_pair");
    await assert.rejects(runner.manager.save(Conversation, { directKey: conversation.directKey }), e => e.code === "23505");
    await runner.query("ROLLBACK TO SAVEPOINT duplicate_pair");
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await AppDataSource.destroy();
  }
});

