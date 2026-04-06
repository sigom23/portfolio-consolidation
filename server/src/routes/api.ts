import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHoldingsByUser, getStockHoldingsByUser, updateHoldingValue } from "../lib/db.js";
import { getQuotes } from "../lib/fmp.js";
import { getExchangeRates, SUPPORTED_CURRENCIES } from "../lib/forex.js";
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

// POST /api/holdings/refresh-prices — update stock holdings with latest prices
router.post("/holdings/refresh-prices", async (req: Request, res: Response) => {
  try {
    const stockHoldings = await getStockHoldingsByUser(req.session.userId!);

    if (stockHoldings.length === 0) {
      res.json({ success: true, data: { updated: 0 } });
      return;
    }

    // Get unique tickers
    const tickers = [...new Set(stockHoldings.filter((h) => h.ticker).map((h) => h.ticker!))];
    const prices = await getQuotes(tickers);

    let updated = 0;
    for (const holding of stockHoldings) {
      if (holding.ticker && holding.quantity) {
        const price = prices.get(holding.ticker.toUpperCase());
        if (price !== undefined) {
          const newValue = holding.quantity * price;
          await updateHoldingValue(holding.id, newValue);
          updated++;
        }
      }
    }

    // Return updated holdings
    const allHoldings = await getHoldingsByUser(req.session.userId!);
    res.json({ success: true, data: { updated, holdings: allHoldings } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price refresh failed";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/exchange-rates?base=USD
router.get("/exchange-rates", async (req: Request, res: Response) => {
  try {
    const base = (typeof req.query.base === "string" ? req.query.base : "USD").toUpperCase();
    const rates = await getExchangeRates(base);
    res.json({ success: true, data: { base, rates, currencies: SUPPORTED_CURRENCIES } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch exchange rates";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
