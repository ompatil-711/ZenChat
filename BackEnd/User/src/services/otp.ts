import { createHmac } from "node:crypto";
import { HttpError } from "@zenchat/database";
export function emailValue(value: unknown) {
  if (typeof value !== "string") throw new HttpError(400, "A valid email address is required.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "A valid email address is required.");
  return email;
}
export const digest = (email: string, otp: string) => createHmac("sha256", process.env.JWT_SECRET!).update(email + ":" + otp).digest("hex");
export const VERIFY_CHALLENGE_SCRIPT = `
  local value = redis.call('GET', KEYS[1])
  if not value then return 0 end
  local record = cjson.decode(value)
  if record.digest == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end
  record.attempts = record.attempts + 1
  if record.attempts >= 5 then redis.call('DEL', KEYS[1]); return -1 end
  redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
  return 0
`;
export const RELEASE_CHALLENGE_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end
  if redis.call('GET', KEYS[2]) == ARGV[2] then redis.call('DEL', KEYS[2]) end
  return 1
`;

