import "dotenv/config";
import express from "express";
import cors from "cors";
import { AppDataSource, initializeDatabase, HttpError, safeError } from "@zenchat/database";
import type { Request, Response, NextFunction } from "express";
import chatRoutes from "./routes/chat.js";
import { app, server, io } from "./config/socket.js";
app.use(cors({ origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(",") }));
app.use(express.json({ limit: "32kb" }));
app.get("/", (_req, res) => { res.json({ service: "chat", status: "alive" }); });
app.get("/health/ready", async (_req, res) => {
  try { await AppDataSource.query("SELECT 1"); res.json({ ready: true }); }
  catch { res.status(503).json({ ready: false }); }
});
app.use("/api/v1/chat", chatRoutes);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Upload/request failed", safeError(error));
  res.status(error instanceof HttpError ? error.status : 400).json({
    message: error instanceof HttpError ? error.message : "Invalid request or image upload failed.",
  });
});
async function start() {
  await initializeDatabase();
  server.listen(Number(process.env.PORT || 5001), () => console.log("Chat API and Socket.IO listening"));
  server.on("error", error => { console.error("Chat listen failed", safeError(error)); void shutdown(); });
  async function shutdown() {
    io.close();
    server.close();
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}
void start().catch((error: unknown) => {
  console.error("Chat startup failed:", error instanceof Error && /DATABASE_URL|migrations/.test(error.message) ? error.message : safeError(error));
  if (AppDataSource.isInitialized) void AppDataSource.destroy();
  process.exitCode = 1;
});
