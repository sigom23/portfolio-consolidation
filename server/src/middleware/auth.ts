import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { pool } from "../lib/db.js";
import { createOrUpdateUser } from "../lib/db.js";

const PgSession = connectPgSimple(session);

export function sessionMiddleware(): RequestHandler {
  return session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
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
export async function devModeAutoLogin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (process.env.DEV_MODE === "true" && !req.session.userId) {
    const devUser = await createOrUpdateUser("dev-user-1", "dev@localhost", "Dev User");
    req.session.userId = devUser.id;
  }
  next();
}
