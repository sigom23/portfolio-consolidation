import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// POST /api/uploads — Phase 2
router.post("/", (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: "Uploads not yet implemented (Phase 2)" });
});

export default router;
