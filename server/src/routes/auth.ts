import { Router } from "express";
import type { Request, Response } from "express";
import { getClient, getAuthorizationUrl, handleCallback } from "../lib/auth.js";
import { createOrUpdateUser, getUserById } from "../lib/db.js";

const router = Router();

// GET /auth/login — redirect to Pocket ID
router.get("/login", async (req: Request, res: Response) => {
  try {
    if (process.env.DEV_MODE === "true") {
      const devUser = await createOrUpdateUser("dev-user-1", "dev@localhost", "Dev User");
      req.session.userId = devUser.id;
      res.redirect("/dashboard");
      return;
    }

    const client = await getClient();
    const { url, nonce, state } = getAuthorizationUrl(client);
    req.session.nonce = nonce;
    req.session.state = state;
    res.redirect(url);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Failed to initiate login" });
  }
});

// GET /auth/callback — handle OIDC callback
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const client = await getClient();
    // Use the configured callback URL + query string to avoid protocol mismatch behind proxy
    const callbackBase = process.env.CALLBACK_URL!;
    const queryString = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
    const fullUrl = callbackBase + queryString;

    const userinfo = await handleCallback(client, fullUrl, {
      nonce: req.session.nonce,
      state: req.session.state,
    });

    const user = await createOrUpdateUser(userinfo.sub, userinfo.email, userinfo.name);
    req.session.userId = user.id;
    delete req.session.nonce;
    delete req.session.state;

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ success: false, error: "Authentication failed" });
  }
});

// GET /auth/logout — destroy session
router.get("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// GET /auth/me — return current user
router.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.json({ success: true, data: null });
    return;
  }

  const user = await getUserById(req.session.userId);
  res.json({ success: true, data: user ?? null });
});

export default router;
