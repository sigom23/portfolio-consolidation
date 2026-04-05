import session from "express-session";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { createOrUpdateUser } from "../lib/db.js";

export function sessionMiddleware(): RequestHandler {
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId) {
    next();
    return;
  }
  res.status(401).json({ success: false, error: "Not authenticated" });
}

// In DEV_MODE, auto-login as a test user on every request if not already logged in
export function devModeAutoLogin(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.DEV_MODE === "true" && !req.session.userId) {
    const devUser = createOrUpdateUser("dev-user-1", "dev@localhost", "Dev User");
    req.session.userId = devUser.id;
  }
  next();
}
