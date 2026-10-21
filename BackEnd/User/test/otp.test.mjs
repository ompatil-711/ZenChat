import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { emailValue, digest, VERIFY_CHALLENGE_SCRIPT, RELEASE_CHALLENGE_SCRIPT } from "../dist/services/otp.js";
process.env.JWT_SECRET ||= "isolated-unit-test-secret-not-used-by-the-application";
test("email validation and OTP digests", () => {
  assert.equal(emailValue(" Alice@Example.com "), "alice@example.com");
  assert.throws(() => emailValue("not-an-email"));
  assert.throws(() => emailValue({ email: "a@example.com" }));
  assert.notEqual(digest("a@example.com", "123456"), digest("b@example.com", "123456"));
});
test("Redis: one-time verification, attempt limit, expiry, and owned rollback", { skip: process.env.RUN_REDIS_TESTS !== "1", timeout: 30000 }, async () => {
  const { redisClient: redis } = await import("../dist/config/redis.js");
  await redis.connect();
  const email = "test-" + randomUUID() + "@example.invalid";
  const key = "otp:" + email;
  const rateKey = "otp:ratelimit:" + email;
  const hash = digest(email, "123456");
  const record = JSON.stringify({ digest: hash, attempts: 0, requestId: "test" });
  const verify = value => redis.eval(VERIFY_CHALLENGE_SCRIPT, { keys: [key], arguments: [value] });
  try {
    await redis.set(key, record, { EX: 30 });
    const race = await Promise.all([verify(hash), verify(hash)]);
    assert.deepEqual(race.map(Number).sort(), [0, 1]);
    await redis.set(key, record, { EX: 30 });
    for (let i = 0; i < 4; i++) assert.equal(Number(await verify("wrong")), 0);
    assert.equal(Number(await verify("wrong")), -1);
    assert.equal(await redis.get(key), null);
    await redis.set(key, record, { EX: 1 });
    await sleep(1200);
    assert.equal(Number(await verify(hash)), 0);
    assert.equal(await redis.set(rateKey, "first", { NX: true, EX: 30 }), "OK");
    assert.equal(await redis.set(rateKey, "second", { NX: true, EX: 30 }), null);
    await redis.set(key, "newer-record", { EX: 30 });
    await redis.eval(RELEASE_CHALLENGE_SCRIPT, { keys: [rateKey, key], arguments: ["stale-request", record] });
    assert.equal(await redis.get(rateKey), "first");
    assert.equal(await redis.get(key), "newer-record");
  } finally {
    await redis.del([key, rateKey]);
    redis.destroy();
  }
});

