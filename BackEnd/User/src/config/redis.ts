import "dotenv/config";
import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  disableOfflineQueue: true,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => retries >= 3 ? false : Math.min(250 * (retries + 1), 1000),
  },
});
// Bound each command, rather than closing a healthy connection after an idle period.
export const redisCommand = () => redisClient.withCommandOptions({ abortSignal: AbortSignal.timeout(5000) });
redisClient.on("error", () => console.error("Redis unavailable; OTP requests will fail promptly."));

