import type { Request, Response, NextFunction } from "express";
import { HttpError, safeError } from "@zenchat/database";
import type { PublicUser } from "@zenchat/database";
export interface AuthRequest extends Request { user?: PublicUser }
export default function TryCatch(handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try { await handler(req, res, next); }
    catch (error: unknown) {
      console.error("Chat request failed", safeError(error));
      if (!res.headersSent) res.status(error instanceof HttpError ? error.status : 503).json({
        message: error instanceof HttpError ? error.message : "Chat service temporarily unavailable.",
      });
    }
  };
}
