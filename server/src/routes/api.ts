import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHoldingsByUser } from "../lib/db.js";
import type { PortfolioSummary } from "../types/index.js";

const router = Router();

router.use(requireAuth);

// GET /api/portfolio/summary
router.get("/portfolio/summary", async (req: Request, res: Response) => {
  const holdings = await getHoldingsByUser(req.session.userId!);

  const breakdown = { stocks: 0, crypto: 0, bonds: 0, cash: 0, other: 0 };
  let totalValue = 0;

  for (const h of holdings) {
    const val = h.value_usd ?? 0;
    totalValue += val;
    const type = (h.asset_type ?? "other").toLowerCase();
    if (type in breakdown) {
      breakdown[type as keyof typeof breakdown] += val;
    } else {
      breakdown.other += val;
    }
  }

  const summary: PortfolioSummary = { totalValue, breakdown };
  res.json({ success: true, data: summary });
});

// GET /api/holdings
router.get("/holdings", async (req: Request, res: Response) => {
  const holdings = await getHoldingsByUser(req.session.userId!);
  res.json({ success: true, data: holdings });
});

export default router;
