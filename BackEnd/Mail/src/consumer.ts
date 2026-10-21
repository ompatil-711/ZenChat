import "dotenv/config";
import amqp from "amqplib";
import { createSmtpTransport } from "./config/smtp.js";

export interface MailJob { to: string; subject: string; body: string; expiresAt: number; requestId: string }
export function isMailJob(value: unknown): value is MailJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<MailJob>;
  return typeof job.to === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.to) &&
    typeof job.subject === "string" && job.subject.length <= 200 &&
    typeof job.body === "string" && job.body.length <= 10000 &&
    typeof job.expiresAt === "number" && Number.isFinite(job.expiresAt) &&
    typeof job.requestId === "string" && job.requestId.length <= 100;
}
const queue = "send-otp";
let connection: amqp.ChannelModel | undefined;
let smtp: ReturnType<typeof createSmtpTransport> | undefined;
let retry: ReturnType<typeof setTimeout> | undefined;
let connecting: Promise<void> | undefined;
let stopped = false;
let ready = false;
export const mailReady = () => ready;

function scheduleReconnect() {
  ready = false;
  if (stopped || retry) return;
  retry = setTimeout(() => { retry = undefined; void startSendOtpConsumer(); }, 5000);
  retry.unref();
}
function failureCode(error: unknown) {
  const e = error as { code?: string; responseCode?: number };
  return { code: e?.code ?? "UNKNOWN", responseCode: e?.responseCode };
}
function publish(channel: amqp.ConfirmChannel, target: string, data: Buffer, attempts: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Broker confirmation timed out")), 5000);
    channel.sendToQueue(target, data, { persistent: true, headers: { attempts }, contentType: "application/json" }, error => {
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    });
  });
}
export function startSendOtpConsumer(): Promise<void> {
  if (ready) return Promise.resolve();
  if (connecting) return connecting;
  stopped = false;
  connecting = (async () => {
    if (!process.env.Rabbitmq_Host) throw new Error("Rabbitmq_Host is required");
    smtp = createSmtpTransport();
    await smtp.transporter.verify();
    const current = await amqp.connect(process.env.Rabbitmq_Host, { timeout: 5000 });
    connection = current;
    current.on("error", error => console.error("AMQP connection error", failureCode(error)));
    current.on("close", () => { smtp?.transporter.close(); scheduleReconnect(); });
    const channel = await current.createConfirmChannel();
    channel.on("error", error => console.error("AMQP channel error", failureCode(error)));
    channel.on("close", () => { ready = false; void current.close().catch(() => {}); });
    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue(queue + ".retry", { durable: true, arguments: {
      "x-message-ttl": 15000, "x-dead-letter-exchange": "", "x-dead-letter-routing-key": queue,
    } });
    await channel.assertQueue(queue + ".failed", { durable: true, arguments: { "x-message-ttl": 86400000 } });
    await channel.prefetch(1);
    await channel.consume(queue, async msg => {
      if (!msg) { void current.close().catch(() => {}); return; }
      try {
        let job: unknown;
        try { job = JSON.parse(msg.content.toString()); } catch {}
        if (!isMailJob(job)) {
          await publish(channel, queue + ".failed", msg.content, 0);
          channel.ack(msg);
          return;
        }
        if (job.expiresAt <= Date.now()) { channel.ack(msg); return; }
        try {
          const info = await smtp!.transporter.sendMail({ from: smtp!.sender, to: job.to, subject: job.subject, text: job.body });
          if (!info.accepted.length) throw new Error("SMTP did not accept a recipient");
          console.log("OTP accepted by SMTP", { requestId: job.requestId });
          channel.ack(msg);
        } catch (error) {
          const previous = Number(msg.properties.headers?.attempts ?? 0);
          const attempts = Number.isFinite(previous) ? previous + 1 : 3;
          const code = failureCode(error);
          const permanent = code.responseCode !== undefined && code.responseCode >= 500;
          const target = attempts < 3 && !permanent ? queue + ".retry" : queue + ".failed";
          await publish(channel, target, msg.content, attempts);
          // Acknowledge only after the replacement is confirmed by the broker.
          channel.ack(msg);
          console.error("OTP delivery failed", { requestId: job.requestId, attempts, target, ...code });
        }
      } catch (error) {
        console.error("OTP queue processing failed", failureCode(error));
        // Closing the channel requeues unacknowledged work without a hot nack/requeue loop.
        await current.close().catch(() => {});
      }
    });
    ready = true;
    console.log("Mail worker ready: AMQP connected and SMTP authenticated");
  })().catch(async error => {
    console.error("Mail startup failed", failureCode(error));
    smtp?.transporter.close();
    await connection?.close().catch(() => {});
    connection = undefined;
    scheduleReconnect();
  }).finally(() => { connecting = undefined; });
  return connecting;
}
export async function stopSendOtpConsumer() {
  stopped = true;
  ready = false;
  if (retry) clearTimeout(retry);
  retry = undefined;
  await connection?.close().catch(() => {});
  smtp?.transporter.close();
}
