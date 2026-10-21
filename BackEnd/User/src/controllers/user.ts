import { randomInt, randomUUID } from "node:crypto";
import { AppDataSource, User, publicUser, generateToken, HttpError, isUuid } from "@zenchat/database";
import { publishtoQueue } from "../config/rabbitmq.js";
import { redisClient, redisCommand } from "../config/redis.js";
import TryCatch from "../config/TryCatch.js";

import { emailValue, digest, VERIFY_CHALLENGE_SCRIPT, RELEASE_CHALLENGE_SCRIPT } from "../services/otp.js";

export const loginUser = TryCatch(async (req, res) => {
  const email = emailValue(req.body?.email);
  if (!redisClient.isReady) throw new HttpError(503, "Verification service is unavailable.");
  const requestId = randomUUID();
  const rateKey = "otp:ratelimit:" + email;
  const acquired = await redisCommand().set(rateKey, requestId, { NX: true, EX: 60 });
  if (!acquired) throw new HttpError(429, "Please wait 60 seconds before requesting another code.");
  const otp = randomInt(100000, 1000000).toString();
  const otpKey = "otp:" + email;
  const record = JSON.stringify({ digest: digest(email, otp), attempts: 0, requestId });
  try {
    await redisCommand().set(otpKey, record, { EX: 300 });
    await publishtoQueue("send-otp", {
      to: email, subject: "Your verification code - ZenChat",
      body: "Your OTP is " + otp + ". It is valid for 5 minutes.",
      expiresAt: Date.now() + 300000, requestId,
    });
  } catch (error) {
    // Only release this request's state; never delete a newer challenge.
    await redisCommand().eval(RELEASE_CHALLENGE_SCRIPT, { keys: [rateKey, otpKey], arguments: [requestId, record] }).catch(() => {});
    throw error;
  }
  res.status(202).json({ message: "Verification email queued. Check your inbox shortly." });
});

export const verifyUser = TryCatch(async (req, res) => {
  const email = emailValue(req.body?.email);
  const otp: unknown = req.body?.otp;
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) throw new HttpError(400, "Enter the six-digit verification code.");
  if (!redisClient.isReady) throw new HttpError(503, "Verification service is unavailable.");
  // Redis executes this atomically: one success, at most five wrong attempts, original TTL preserved.
  const result = Number(await redisCommand().eval(VERIFY_CHALLENGE_SCRIPT, { keys: ["otp:" + email], arguments: [digest(email, otp)] }));
  if (result !== 1) throw new HttpError(400, result === -1 ? "Too many attempts. Request a new code." : "Invalid or expired code.");
  const users = AppDataSource.getRepository(User);
  await users.createQueryBuilder().insert().values({ email, name: email.split("@")[0]!.slice(0, 80) }).orIgnore().execute();
  const user = await users.findOneByOrFail({ email });
  res.json({ message: "User verified", user: publicUser(user), token: generateToken(user) });
});

export const myProfile = TryCatch(async (req, res) => { res.json(req.user); });
export const updateName = TryCatch(async (req, res) => {
  const name: unknown = req.body?.name;
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) throw new HttpError(400, "Name must contain 1–80 characters.");
  const users = AppDataSource.getRepository(User);
  const user = await users.findOneByOrFail({ id: req.user!._id });
  user.name = name.trim();
  await users.save(user);
  res.json({ message: "Profile updated", user: publicUser(user), token: generateToken(user) });
});
export const getAllUsers = TryCatch(async (_req, res) => {
  const users = await AppDataSource.getRepository(User).find({ order: { name: "ASC" }, take: 500 });
  res.json(users.map(publicUser));
});
export const getAUser = TryCatch(async (req, res) => {
  const id = req.params.id;
  if (!isUuid(id)) throw new HttpError(400, "Invalid user ID.");
  const user = await AppDataSource.getRepository(User).findOneBy({ id });
  if (!user) throw new HttpError(404, "User not found.");
  res.json(publicUser(user));
});
