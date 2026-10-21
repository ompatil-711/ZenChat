import "dotenv/config";
import amqp from "amqplib";
import { HttpError, safeError } from "@zenchat/database";

let channel: amqp.ConfirmChannel | undefined;
let connection: amqp.ChannelModel | undefined;
let connecting: Promise<void> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let stopping = false;
export const brokerReady = () => !!channel;

function scheduleReconnect() {
  channel = undefined;
  if (stopping || retry) return;
  retry = setTimeout(() => {
    retry = undefined;
    void connectRabbitMQ().catch((error: unknown) => console.error("Broker reconnect failed", safeError(error)));
  }, 5000);
  retry.unref();
}
export function connectRabbitMQ(): Promise<void> {
  if (channel) return Promise.resolve();
  if (connecting) return connecting;
  connecting = (async () => {
    if (!process.env.Rabbitmq_Host) throw new Error("Rabbitmq_Host is required");
    const current = await amqp.connect(process.env.Rabbitmq_Host, { timeout: 5000 });
    connection = current;
    current.on("error", (error: unknown) => console.error("Broker connection error", safeError(error)));
    current.on("close", scheduleReconnect);
    const next = await current.createConfirmChannel();
    next.on("error", (error: unknown) => console.error("Broker channel error", safeError(error)));
    next.on("close", () => { channel = undefined; void current.close().catch(() => {}); });
    await next.assertQueue("send-otp", { durable: true });
    channel = next;
    console.log("OTP publisher connected to AMQP broker");
  })().catch((error: unknown) => { scheduleReconnect(); throw error; }).finally(() => { connecting = undefined; });
  return connecting;
}
export async function publishtoQueue(queueName: string, message: unknown) {
  const current = channel;
  if (!current) throw new HttpError(503, "Email queue is unavailable. Please try again shortly.");
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new HttpError(503, "Email queue confirmation timed out.")), 5000);
    current.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      persistent: true, contentType: "application/json", expiration: "300000",
    }, (error: unknown) => {
      clearTimeout(timer);
      if (error) reject(new HttpError(503, "Could not queue the verification email."));
      else resolve();
    });
  });
}
export async function closeRabbitMQ() {
  stopping = true;
  if (retry) clearTimeout(retry);
  channel = undefined;
  await connection?.close().catch(() => {});
}
