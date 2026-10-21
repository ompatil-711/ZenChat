import "dotenv/config";
import express from "express";
import cors from "cors";
import { AppDataSource, initializeDatabase, safeError } from "@zenchat/database";
import { redisClient } from "./config/redis.js";
import { connectRabbitMQ, brokerReady, closeRabbitMQ } from "./config/rabbitmq.js";
import userRoutes from "./routes/user.js";

const app = express();
app.use(cors({ origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(",") }));
app.use(express.json({ limit: "16kb" }));
app.get("/", (_req, res) => { res.json({ service: "user", status: "alive" }); });
app.get("/health/ready", async (_req, res) => {
  let database = false;
  try { await AppDataSource.query("SELECT 1"); database = true; } catch {}
  const ready = database && redisClient.isReady && brokerReady();
  res.status(ready ? 200 : 503).json({ ready, database, redis: redisClient.isReady, broker: brokerReady() });
});
app.use("/api/v1/user", userRoutes);

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  await initializeDatabase();
  await redisClient.connect();
  await connectRabbitMQ().catch((error: unknown) => console.error("OTP queue unavailable", safeError(error)));
  const server = app.listen(Number(process.env.PORT || 5000), () => console.log("User API listening"));
  server.on("error", (error) => { console.error("User listen failed", safeError(error)); void shutdown(); });
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    server.close();
    await closeRabbitMQ();
    if (redisClient.isOpen) redisClient.destroy();
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}
void start().catch((error: unknown) => {
  console.error("User startup failed:", error instanceof Error && /DATABASE_URL|migrations|JWT_SECRET/.test(error.message) ? error.message : safeError(error));
  if (redisClient.isOpen) redisClient.destroy();
  if (AppDataSource.isInitialized) void AppDataSource.destroy();
  process.exitCode = 1;
});
