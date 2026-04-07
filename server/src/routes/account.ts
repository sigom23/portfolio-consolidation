import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { deleteUserAccount, deleteAllHoldings, exportUserData } from "../lib/db.js";

const router = Router();
router.use(requireAuth);

// GET /api/account/export — download all user data as JSON
router.get("/export", async (req: Request, res: Response) => {
  try {
    const data = await exportUserData(req.session.userId!);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="portfolio-export-${date}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/account/holdings — clear all holdings
router.delete("/holdings", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteAllHoldings(req.session.userId!);
    res.json({ success: true, data: { deleted } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear holdings";
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/account — delete account and all data
router.delete("/", async (req: Request, res: Response) => {
  try {
    await deleteUserAccount(req.session.userId!);
    req.session.destroy(() => {
      res.json({ success: true });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Account deletion failed";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
