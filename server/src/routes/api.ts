import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getHoldingsByUser, getStockHoldingsByUser, updateHoldingValue } from "../lib/db.js";
import { getQuotes, getCompanyProfile, getHistoricalPrices } from "../lib/fmp.js";
import { getExchangeRates, SUPPORTED_CURRENCIES } from "../lib/forex.js";
import { writeWealthSnapshotSafe } from "../lib/snapshots.js";
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

    // Get unique tickers with exchange codes
    const seen = new Set<string>();
    const tickerHoldings: { ticker: string; exchCode?: string | null }[] = [];
    for (const h of stockHoldings) {
      if (h.ticker && !seen.has(h.ticker.toUpperCase())) {
        seen.add(h.ticker.toUpperCase());
        tickerHoldings.push({ ticker: h.ticker, exchCode: h.exch_code });
      }
    }
    const prices = await getQuotes(tickerHoldings);

    // Get exchange rates for currency conversion to USD
    const rates = await getExchangeRates("USD");

    let updated = 0;
    for (const holding of stockHoldings) {
      if (holding.ticker && holding.quantity) {
        const quote = prices.get(holding.ticker.toUpperCase());
        if (quote) {
          const valueLocal = holding.quantity * quote.price;

          // Convert from the price's actual currency (from FMP) to USD
          const priceCcy = quote.currency.toUpperCase();
          let valueUsd = valueLocal;
          if (priceCcy !== "USD" && rates[priceCcy]) {
            valueUsd = valueLocal / rates[priceCcy];
          }

          await updateHoldingValue(holding.id, valueUsd, valueLocal);
          updated++;
        }
      }
    }

    // Return updated holdings
    const allHoldings = await getHoldingsByUser(req.session.userId!);
    await writeWealthSnapshotSafe(req.session.userId!, "price_refresh");
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

// GET /api/holdings/sector-allocation — sector breakdown for stock holdings
router.get("/holdings/sector-allocation", async (req: Request, res: Response) => {
  try {
    const stockHoldings = await getStockHoldingsByUser(req.session.userId!);
    const sectorMap = new Map<string, number>();

    // Fetch profiles to get sector info
    for (const h of stockHoldings) {
      if (!h.ticker || !h.value_usd) continue;
      const profile = await getCompanyProfile(h.ticker, h.exch_code ?? undefined);
      const sector = profile?.sector || "Unknown";
      sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + h.value_usd);
    }

    const sectors = [...sectorMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({ success: true, data: sectors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute sector allocation";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/holdings/geography-allocation — geography breakdown for stock holdings
router.get("/holdings/geography-allocation", async (req: Request, res: Response) => {
  try {
    const stockHoldings = await getStockHoldingsByUser(req.session.userId!);
    const regionMap = new Map<string, number>();

    for (const h of stockHoldings) {
      if (!h.ticker || !h.value_usd) continue;
      const profile = await getCompanyProfile(h.ticker, h.exch_code ?? undefined);
      const country = profile?.country || "Unknown";
      const region = countryToRegion(country);
      regionMap.set(region, (regionMap.get(region) ?? 0) + h.value_usd);
    }

    const regions = [...regionMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({ success: true, data: regions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute geography allocation";
    res.status(500).json({ success: false, error: message });
  }
});

function countryToRegion(country: string): string {
  const c = country.toUpperCase();
  const northAmerica = ["US", "CA", "UNITED STATES", "CANADA", "USA", "MX", "MEXICO"];
  const europe = [
    "GB", "UK", "DE", "FR", "CH", "NL", "SE", "NO", "DK", "FI", "IE", "ES", "IT", "PT", "AT", "BE", "LU",
    "UNITED KINGDOM", "GERMANY", "FRANCE", "SWITZERLAND", "NETHERLANDS", "SWEDEN", "NORWAY", "DENMARK",
    "FINLAND", "IRELAND", "SPAIN", "ITALY", "PORTUGAL", "AUSTRIA", "BELGIUM", "LUXEMBOURG",
  ];
  const asiaPacific = [
    "JP", "CN", "HK", "KR", "TW", "AU", "NZ", "SG", "IN",
    "JAPAN", "CHINA", "HONG KONG", "SOUTH KOREA", "TAIWAN", "AUSTRALIA", "NEW ZEALAND", "SINGAPORE", "INDIA",
  ];

  if (northAmerica.includes(c)) return "North America";
  if (europe.includes(c)) return "Europe";
  if (asiaPacific.includes(c)) return "Asia Pacific";
  if (c === "UNKNOWN" || c === "") return "Unknown";
  return "Emerging Markets";
}

// GET /api/company/:ticker — company profile for hover card
router.get("/company/:ticker", async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker).toUpperCase();
  if (!ticker) {
    res.status(400).json({ success: false, error: "Ticker required" });
    return;
  }

  const exchCode = typeof req.query.exch === "string" ? req.query.exch : undefined;
  const profile = await getCompanyProfile(ticker, exchCode);
  if (!profile) {
    res.status(404).json({ success: false, error: "Company not found" });
    return;
  }

  res.json({ success: true, data: profile });
});

// GET /api/company/:ticker/history — 6 month price history for sparkline
router.get("/company/:ticker/history", async (req: Request, res: Response) => {
  const ticker = String(req.params.ticker).toUpperCase();
  const exchCode = typeof req.query.exch === "string" ? req.query.exch : undefined;
  const prices = await getHistoricalPrices(ticker, exchCode);
  res.json({ success: true, data: prices });
});

export default router;
