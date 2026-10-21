import type { Request, Response, NextFunction } from "express";
import { authenticateToken } from "@zenchat/database";
import type { PublicUser } from "@zenchat/database";
export interface AuthenticatedRequest extends Request { user?: PublicUser }
export async function isAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  if (!token) { res.status(401).json({ message: "Please log in." }); return; }
  try { req.user = await authenticateToken(token); next(); }
  catch { res.status(401).json({ message: "Session expired or invalid. Please log in again." }); }
}
export default isAuth;
