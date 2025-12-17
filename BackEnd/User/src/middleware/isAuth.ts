import type { NextFunction, Request, Response } from "express";
import type { IUser } from "../model/User.js"; // Adjust path if needed
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

// 1. Extend the Express Request interface
export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

export const isAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("[Auth] Middleware started...");

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[Auth] Failed: No Token Provided");
      res.status(401).json({
        message: "Please Login - No auth header",
      });
      return;
    }

    const token = authHeader.split(" ")[1] as string;

    // 2. Verify Token
    const decodedValue = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    console.log("[Auth] Token Verified. Payload:", decodedValue);

    // 3. CRITICAL CHECK: Does your token actually contain a 'user' object?
    // If your generateToken() saved it as { _id: "..." }, then decodedValue.user will be undefined.
    if (!decodedValue || !decodedValue.user) {
      console.log("[Auth] Failed: Token is valid but user data is missing in payload");
      res.status(401).json({
        message: "Invalid token structure",
      });
      return;
    }

    req.user = decodedValue.user;

    console.log("[Auth] Success. Moving to controller...");
    next();
    
  } catch (error) {
    console.log("[Auth] Error:", error);
    res.status(401).json({
      message: "Please Login - JWT error",
    });
  }
};