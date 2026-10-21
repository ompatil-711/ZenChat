import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import amqp from "amqplib";
import nodemailer from "nodemailer";
import { isMailJob, startSendOtpConsumer, stopSendOtpConsumer, mailReady } from "../dist/consumer.js";
const job = () => ({ to: "recipient@example.invalid", subject: "OTP", body: "test fixture", requestId: "test", expiresAt: Date.now() + 60000 });
test("mail jobs require explicit expiry and valid payloads", () => {
  assert.equal(isMailJob(job()), true);
  assert.equal(isMailJob({ ...job(), expiresAt: undefined }), false);
  assert.equal(isMailJob({ ...job(), to: "invalid" }), false);
  assert.equal(isMailJob(null), false);
});
test("delivery acknowledgements, expiry, confirmed retries, and dead letters", async context => {
  let consumer; let acknowledged = 0; let mode = "ok"; let sent = 0;
  const replacements = [];
  const channel = Object.assign(new EventEmitter(), {
    assertQueue: async () => {}, prefetch: async () => {},
    consume: async (_name, callback) => { consumer = callback; },
    ack: () => { acknowledged++; },
    sendToQueue: (name, content, options, callback) => { replacements.push({ name, content, options }); callback(null); return true; },
  });
  const connection = Object.assign(new EventEmitter(), { createConfirmChannel: async () => channel, close: async () => {} });
  context.mock.method(amqp, "connect", async () => connection);
  context.mock.method(nodemailer, "createTransport", () => ({
    verify: async () => true, close: () => {},
    sendMail: async options => { sent++; assert.equal(options.text, "test fixture"); if (mode === "error") throw Object.assign(new Error("Simulated"), { responseCode: 421 }); return { accepted: [options.to] }; },
  }));
  process.env.GMAIL_USER = "sender@example.invalid"; process.env.Password = "not-a-real-password";
  process.env.Rabbitmq_Host = "amqp://test.invalid";
  try {
    await startSendOtpConsumer();
    assert.equal(mailReady(), true);
    const message = (body, attempts = 0) => ({ content: Buffer.from(JSON.stringify(body)), properties: { headers: { attempts } } });
    await consumer(message(job()));
    assert.equal(sent, 1); assert.equal(acknowledged, 1);
    await consumer(message({ ...job(), expiresAt: Date.now() - 1 }));
    assert.equal(sent, 1); assert.equal(acknowledged, 2);
    mode = "error";
    await consumer(message(job()));
    assert.equal(replacements.at(-1).name, "send-otp.retry");
    assert.equal(replacements.at(-1).options.headers.attempts, 1);
    await consumer(message(job(), 2));
    assert.equal(replacements.at(-1).name, "send-otp.failed");
    await consumer(message({ malformed: true }));
    assert.equal(replacements.at(-1).name, "send-otp.failed");
    assert.equal(acknowledged, 5);
  } finally { await stopSendOtpConsumer(); }
});

