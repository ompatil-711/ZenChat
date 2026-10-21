import { redisClient } from "./config/redis.js";
try { await redisClient.connect(); console.log("Redis:", await redisClient.ping()); }
catch (error) {
  const value = error as { name?: string; code?: string };
  console.error("Redis verification failed", { name: value.name, code: value.code });
  process.exitCode = 1;
} finally { if (redisClient.isOpen) redisClient.destroy(); }
