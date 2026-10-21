import "dotenv/config";
import express from "express";
import { startSendOtpConsumer, stopSendOtpConsumer, mailReady } from "./consumer.js";
const app = express();
app.get("/", (_req, res) => { res.json({ service: "mail", status: "alive" }); });
app.get("/health/ready", (_req, res) => { res.status(mailReady() ? 200 : 503).json({ ready: mailReady() }); });
const server = app.listen(Number(process.env.PORT || 5002), () => console.log("Mail health API listening"));
server.on("error", () => { console.error("Mail health port is unavailable"); void stopSendOtpConsumer(); });
void startSendOtpConsumer();
async function shutdown() { server.close(); await stopSendOtpConsumer(); }
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
