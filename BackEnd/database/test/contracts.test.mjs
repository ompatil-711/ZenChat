import test from "node:test";
import assert from "node:assert/strict";
import { directKey, isUuid, publicUser, publicMessage } from "../dist/contracts.js";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
test("direct conversations have a canonical, validated pair key", () => {
  assert.equal(directKey(a, b), directKey(b, a));
  assert.throws(() => directKey(a, a));
  assert.throws(() => directKey(a, "bad-id"));
  assert.equal(isUuid(undefined), false);
});
test("API serializers preserve frontend field names without leaking entity internals", () => {
  assert.deepEqual(publicUser({ id: a, name: "Alice", email: "alice@example.invalid", internal: "private" }),
    { _id: a, name: "Alice", email: "alice@example.invalid" });
  const message = publicMessage({ id: b, conversationId: a, senderId: a, text: null,
    imageUrl: "https://example.invalid/image.png", imagePublicId: "file-id", seen: false, seenAt: null, createdAt: new Date(0) });
  assert.equal(message.chatId, a);
  assert.equal(message.messageType, "image");
  assert.equal(message.image.publicId, "file-id");
  assert.equal(message.text, "");
});

