import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import amqp from "amqplib";
import { connectRabbitMQ, publishtoQueue, closeRabbitMQ, brokerReady } from "../dist/config/rabbitmq.js";
test("OTP publisher reports unavailable channels and waits for broker confirmation", async context => {
  await assert.rejects(publishtoQueue("send-otp", {}), error => error.status === 503);
  let rejectPublish = false; let published = false;
  const channel = Object.assign(new EventEmitter(), {
    assertQueue: async () => {},
    sendToQueue: (_queue, _body, options, callback) => {
      assert.equal(options.persistent, true);
      published = true;
      queueMicrotask(() => callback(rejectPublish ? new Error("Rejected") : null));
      return true;
    },
  });
  const connection = Object.assign(new EventEmitter(), { createConfirmChannel: async () => channel, close: async () => {} });
  context.mock.method(amqp, "connect", async () => connection);
  process.env.Rabbitmq_Host = "amqp://test.invalid";
  try {
    await connectRabbitMQ();
    assert.equal(brokerReady(), true);
    await publishtoQueue("send-otp", { fixture: true });
    assert.equal(published, true);
    rejectPublish = true;
    await assert.rejects(publishtoQueue("send-otp", {}), error => error.status === 503);
  } finally { await closeRabbitMQ(); }
});

