import jwt from "jsonwebtoken";
import { AppDataSource } from "./data-source.js";
import { User } from "./entities/User.entity.js";
import { isUuid, publicUser } from "./contracts.js";

function secret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return process.env.JWT_SECRET;
}
export function generateToken(user: User) {
  return jwt.sign({}, secret(), { subject: user.id, issuer: "zenchat", expiresIn: "15d", algorithm: "HS256" });
}
export async function authenticateToken(token: string) {
  const payload = jwt.verify(token, secret(), { issuer: "zenchat", algorithms: ["HS256"] });
  if (typeof payload === "string" || !isUuid(payload.sub)) throw new Error("Invalid session");
  const user = await AppDataSource.getRepository(User).findOneBy({ id: payload.sub });
  if (!user) throw new Error("Session user no longer exists");
  return publicUser(user);
}

