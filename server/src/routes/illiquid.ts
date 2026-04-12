import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getIlliquidAssetsByUser,
  getIlliquidAssetById,
  createIlliquidAsset,
  updateIlliquidAsset,
  deleteIlliquidAsset,
  syncIlliquidHolding,
  deleteIlliquidHolding,
  type NewIlliquidAsset,
} from "../lib/db.js";
import { getExchangeRates } from "../lib/forex.js";
import { writeWealthSnapshotSafe } from "../lib/snapshots.js";
import {
  illiquidAssetNativeValue,
  type IlliquidAsset,
  type IlliquidSubtype,
} from "../types/index.js";

const router = Router();
router.use(requireAuth);

const VALID_SUBTYPES: IlliquidSubtype[] = [
  "private_equity",
  "pension",
  "unvested_equity",
  "startup",
];

function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  if (!rates[ccy]) return amount;
  return amount / rates[ccy];
}

/**
 * Sync the wealth contribution of this illiquid asset into holdings.
 *
 * Wealth contribution is resolved per subtype by `illiquidAssetNativeValue()`:
 *   PE / Pension / Startup → current_value
 *   Unvested Equity        → pro-rata formula from end_value
 *
 * We then FX-convert that native-currency value to USD and upsert the
 * holdings row via syncIlliquidHolding. Failures log-and-continue so a
 * transient FX outage never blocks CRUD.
 */
async function syncHoldingForIlliquid(userId: string, asset: IlliquidAsset): Promise<void> {
  try {
    const rates = await getExchangeRates("USD");
    const nativeValue = illiquidAssetNativeValue(asset);
    const valueUsd = toUsd(nativeValue, asset.currency, rates);
    await syncIlliquidHolding(userId, asset, valueUsd);
  } catch (err) {
    console.warn("Failed to sync illiquid holding:", err instanceof Error ? err.message : err);
  }
}

// Narrow helpers — body values are `unknown`, we only keep them if they match the expected type
function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && !isNaN(v) ? v : null;
}

function intOrNull(v: unknown): number | null {
  if (typeof v !== "number" || isNaN(v)) return null;
  return Math.trunc(v);
}

// ============================================================
// Routes
// ============================================================

// GET /api/illiquid — list all illiquid assets for the user
router.get("/illiquid", async (req: Request, res: Response) => {
  try {
    const assets = await getIlliquidAssetsByUser(req.session.userId!);
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch illiquid assets",
    });
  }
});

// POST /api/illiquid — create a new illiquid asset + sync to holdings
router.post("/illiquid", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    // --- Common validation ---
    if (typeof body.subtype !== "string" || !VALID_SUBTYPES.includes(body.subtype as IlliquidSubtype)) {
      res.status(400).json({
        success: false,
        error: `subtype must be one of: ${VALID_SUBTYPES.join(", ")}`,
      });
      return;
    }
    const subtype = body.subtype as IlliquidSubtype;

    if (typeof body.name !== "string" || !body.name.trim()) {
      res.status(400).json({ success: false, error: "name is required" });
      return;
    }

    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "CHF";

    // --- Subtype-specific validation ---
    // For PE / Pension / Startup, current_value is the wealth contribution.
    // For Unvested Equity, end_value + vesting_years + grant_start_date drive
    // the pro-rata formula; current_value is unused.
    if (subtype !== "unvested_equity") {
      if (typeof body.current_value !== "number" || body.current_value < 0) {
        res.status(400).json({
          success: false,
          error: "current_value must be a non-negative number",
        });
        return;
      }
    } else {
      if (typeof body.end_value !== "number" || body.end_value < 0) {
        res.status(400).json({
          success: false,
          error: "end_value must be a non-negative number for unvested equity",
        });
        return;
      }
      if (typeof body.vesting_years !== "number" || body.vesting_years <= 0) {
        res.status(400).json({
          success: false,
          error: "vesting_years must be a positive number for unvested equity",
        });
        return;
      }
      if (typeof body.grant_start_date !== "string" || !body.grant_start_date) {
        res.status(400).json({
          success: false,
          error: "grant_start_date (YYYY-MM-DD) is required for unvested equity",
        });
        return;
      }
    }

    const newAsset: NewIlliquidAsset = {
      subtype,
      name: body.name.trim(),
      current_value: subtype === "unvested_equity" ? null : numOrNull(body.current_value),
      currency,
      notes: strOrNull(body.notes),

      committed_capital: subtype === "private_equity" ? numOrNull(body.committed_capital) : null,
      called_capital: subtype === "private_equity" ? numOrNull(body.called_capital) : null,
      distributed_capital: subtype === "private_equity" ? numOrNull(body.distributed_capital) : null,
      vintage_year: subtype === "private_equity" ? intOrNull(body.vintage_year) : null,
      strategy: subtype === "private_equity" ? strOrNull(body.strategy) : null,
      gp_name: subtype === "private_equity" ? strOrNull(body.gp_name) : null,
      geography: subtype === "private_equity" ? strOrNull(body.geography) : null,
      fund_status: subtype === "private_equity" ? strOrNull(body.fund_status) : null,

      employer: subtype === "unvested_equity" ? strOrNull(body.employer) : null,
      units: subtype === "unvested_equity" ? numOrNull(body.units) : null,
      vesting_years: subtype === "unvested_equity" ? intOrNull(body.vesting_years) : null,
      grant_start_date: subtype === "unvested_equity" ? strOrNull(body.grant_start_date) : null,
      end_value: subtype === "unvested_equity" ? numOrNull(body.end_value) : null,

      amount_invested: subtype === "startup" ? numOrNull(body.amount_invested) : null,
      investment_date: subtype === "startup" ? strOrNull(body.investment_date) : null,
    };

    const asset = await createIlliquidAsset(req.session.userId!, newAsset);
    await syncHoldingForIlliquid(req.session.userId!, asset);
    await writeWealthSnapshotSafe(req.session.userId!, "illiquid");

    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to create illiquid asset",
    });
  }
});

// PUT /api/illiquid/:id — update an illiquid asset + re-sync holding
router.put("/illiquid/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }

    const existing = await getIlliquidAssetById(id, req.session.userId!);
    if (!existing) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const subtype = existing.subtype;

    // Build updates object — only include fields that were provided
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.currency === "string") updates.currency = body.currency.toUpperCase();
    if (body.notes !== undefined) updates.notes = strOrNull(body.notes);

    // Subtype-specific fields
    if (subtype === "private_equity" || subtype === "pension" || subtype === "startup") {
      if (typeof body.current_value === "number") updates.current_value = body.current_value;
    }
    if (subtype === "private_equity") {
      if (body.committed_capital !== undefined) updates.committed_capital = numOrNull(body.committed_capital);
      if (body.called_capital !== undefined) updates.called_capital = numOrNull(body.called_capital);
      if (body.distributed_capital !== undefined) updates.distributed_capital = numOrNull(body.distributed_capital);
      if (body.vintage_year !== undefined) updates.vintage_year = intOrNull(body.vintage_year);
      if (body.strategy !== undefined) updates.strategy = strOrNull(body.strategy);
      if (body.gp_name !== undefined) updates.gp_name = strOrNull(body.gp_name);
      if (body.geography !== undefined) updates.geography = strOrNull(body.geography);
      if (body.fund_status !== undefined) updates.fund_status = strOrNull(body.fund_status);
    }
    if (subtype === "unvested_equity") {
      if (typeof body.end_value === "number") updates.end_value = body.end_value;
      if (typeof body.vesting_years === "number") updates.vesting_years = Math.trunc(body.vesting_years);
      if (typeof body.grant_start_date === "string") updates.grant_start_date = body.grant_start_date;
      if (body.employer !== undefined) updates.employer = strOrNull(body.employer);
      if (body.units !== undefined) updates.units = numOrNull(body.units);
    }
    if (subtype === "startup") {
      if (body.amount_invested !== undefined) updates.amount_invested = numOrNull(body.amount_invested);
      if (body.investment_date !== undefined) updates.investment_date = strOrNull(body.investment_date);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "no valid fields to update" });
      return;
    }

    const updated = await updateIlliquidAsset(id, req.session.userId!, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }

    await syncHoldingForIlliquid(req.session.userId!, updated);
    await writeWealthSnapshotSafe(req.session.userId!, "illiquid");

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update illiquid asset",
    });
  }
});

// DELETE /api/illiquid/:id — delete asset + its synced holding
router.delete("/illiquid/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }

    // Verify ownership before deleting the holding (otherwise a 404 asset
    // could still nuke a holdings row, though user_id scoping prevents it).
    const existing = await getIlliquidAssetById(id, req.session.userId!);
    if (!existing) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }

    await deleteIlliquidAsset(id, req.session.userId!);
    await deleteIlliquidHolding(req.session.userId!, id);
    await writeWealthSnapshotSafe(req.session.userId!, "illiquid");

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete illiquid asset",
    });
  }
});

export default router;
