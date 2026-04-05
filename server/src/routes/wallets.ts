import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// GET /api/wallets — Phase 3
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: "Wallets not yet implemented (Phase 3)" });
});

// POST /api/wallets — Phase 3
router.post("/", (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: "Wallets not yet implemented (Phase 3)" });
});

export default router;
