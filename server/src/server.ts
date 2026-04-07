import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (two levels up from src/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { initDb } from "./lib/db.js";
import { sessionMiddleware, devModeAutoLogin } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import uploadRoutes from "./routes/uploads.js";
import walletRoutes from "./routes/wallets.js";
import accountRoutes from "./routes/account.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

// Validate required env vars
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

if (process.env.DEV_MODE !== "true") {
  const required = ["SESSION_SECRET", "POCKET_ID_URL", "CLIENT_ID", "CLIENT_SECRET", "CALLBACK_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function start() {
  // Initialize database tables
  await initDb();
  console.log("Database initialized");

  const app = express();

  // Trust Railway's reverse proxy (needed for secure cookies and correct protocol)
  app.set("trust proxy", 1);

  // Middleware
  app.use(cors({ origin: process.env.NODE_ENV !== "production" ? "http://localhost:5173" : false, credentials: true }));
  app.use(express.json());
  app.use(sessionMiddleware());
  app.use(devModeAutoLogin);

  // Routes
  app.use("/auth", authRoutes);
  app.use("/api", apiRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/wallets", walletRoutes);
  app.use("/api/account", accountRoutes);

  // Serve frontend in production
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (process.env.DEV_MODE === "true") {
      console.log("DEV_MODE enabled — auto-login active");
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("WARNING: ANTHROPIC_API_KEY not set — PDF parsing will not work");
    }
    if (!process.env.ETHERSCAN_API_KEY) {
      console.warn("WARNING: ETHERSCAN_API_KEY not set — wallet refresh will not work");
    }
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
