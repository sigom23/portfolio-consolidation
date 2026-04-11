import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getPropertiesByUser,
  getPropertiesWithDetails,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getMortgagesByProperty,
  createMortgage,
  updateMortgage,
  deleteMortgage,
  getCostsByProperty,
  createPropertyCost,
  updatePropertyCost,
  deletePropertyCost,
  syncPropertyHolding,
  deletePropertyHolding,
} from "../lib/db.js";
import { getExchangeRates } from "../lib/forex.js";
import { writeWealthSnapshotSafe } from "../lib/snapshots.js";
import type { Property, PropertyMortgage, PropertyCost, PropertyType, PropertyCostCategory, IncomeFrequency } from "../types/index.js";

const router = Router();
router.use(requireAuth);

const VALID_TYPES: PropertyType[] = ["apartment", "house", "commercial", "land", "other"];
const VALID_COST_CATEGORIES: PropertyCostCategory[] = ["maintenance", "management", "other"];
const VALID_FREQUENCIES: IncomeFrequency[] = ["monthly", "quarterly", "yearly", "irregular"];

function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  if (!rates[ccy]) return amount;
  return amount / rates[ccy];
}

async function syncHoldingForProperty(userId: string, property: Property): Promise<void> {
  try {
    const rates = await getExchangeRates("USD");
    const valueUsd = toUsd(property.current_value, property.currency, rates);
    await syncPropertyHolding(userId, property, valueUsd);
  } catch (err) {
    console.warn("Failed to sync property holding:", err instanceof Error ? err.message : err);
  }
}

// ============================================================
// Properties
// ============================================================

// GET /api/properties — list all with details
router.get("/properties", async (req: Request, res: Response) => {
  try {
    const properties = await getPropertiesWithDetails(req.session.userId!);
    res.json({ success: true, data: properties });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to fetch properties" });
  }
});

// POST /api/properties
router.post("/properties", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    if (typeof body.name !== "string" || !body.name.trim()) {
      res.status(400).json({ success: false, error: "name is required" });
      return;
    }
    const propertyType = typeof body.property_type === "string" && VALID_TYPES.includes(body.property_type as PropertyType)
      ? (body.property_type as PropertyType)
      : "apartment";
    if (typeof body.current_value !== "number" || body.current_value < 0) {
      res.status(400).json({ success: false, error: "current_value must be a non-negative number" });
      return;
    }
    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "CHF";

    const property = await createProperty(req.session.userId!, {
      name: body.name.trim(),
      property_type: propertyType,
      address: typeof body.address === "string" ? body.address.trim() : null,
      purchase_date: typeof body.purchase_date === "string" ? body.purchase_date : null,
      purchase_price: typeof body.purchase_price === "number" ? body.purchase_price : null,
      current_value: body.current_value,
      currency,
      notes: typeof body.notes === "string" ? body.notes.trim() : null,
    });

    await syncHoldingForProperty(req.session.userId!, property);
    await writeWealthSnapshotSafe(req.session.userId!, "property");

    res.json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create property" });
  }
});

// PUT /api/properties/:id
router.put("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: Partial<Property> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.property_type === "string" && VALID_TYPES.includes(body.property_type as PropertyType)) {
      updates.property_type = body.property_type as PropertyType;
    }
    if (body.address !== undefined) updates.address = typeof body.address === "string" ? body.address.trim() : null;
    if (body.purchase_date !== undefined) updates.purchase_date = typeof body.purchase_date === "string" ? body.purchase_date : null;
    if (body.purchase_price !== undefined) updates.purchase_price = typeof body.purchase_price === "number" ? body.purchase_price : null;
    if (typeof body.current_value === "number") updates.current_value = body.current_value;
    if (typeof body.currency === "string") updates.currency = body.currency.toUpperCase();
    if (body.notes !== undefined) updates.notes = typeof body.notes === "string" ? body.notes.trim() : null;

    const property = await updateProperty(id, req.session.userId!, updates);
    if (!property) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }

    await syncHoldingForProperty(req.session.userId!, property);
    await writeWealthSnapshotSafe(req.session.userId!, "property");

    res.json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update property" });
  }
});

// DELETE /api/properties/:id
router.delete("/properties/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    // Remove the linked holding row first
    await deletePropertyHolding(req.session.userId!, id);
    const deleted = await deleteProperty(id, req.session.userId!);
    if (!deleted) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete property" });
  }
});

// ============================================================
// Mortgages (nested under property)
// ============================================================

async function ensurePropertyOwnership(id: number, userId: string): Promise<Property | null> {
  const property = await getPropertyById(id, userId);
  return property ?? null;
}

// GET /api/properties/:id/mortgages
router.get("/properties/:id/mortgages", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const property = await ensurePropertyOwnership(id, req.session.userId!);
    if (!property) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }
    const mortgages = await getMortgagesByProperty(id);
    res.json({ success: true, data: mortgages });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to fetch mortgages" });
  }
});

// POST /api/properties/:id/mortgages
router.post("/properties/:id/mortgages", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const property = await ensurePropertyOwnership(id, req.session.userId!);
    if (!property) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    if (typeof body.original_amount !== "number" || body.original_amount < 0) {
      res.status(400).json({ success: false, error: "original_amount must be a non-negative number" });
      return;
    }
    if (typeof body.current_balance !== "number" || body.current_balance < 0) {
      res.status(400).json({ success: false, error: "current_balance must be a non-negative number" });
      return;
    }
    if (typeof body.interest_rate !== "number" || body.interest_rate < 0) {
      res.status(400).json({ success: false, error: "interest_rate must be a non-negative number" });
      return;
    }

    const mortgage = await createMortgage(id, {
      lender: typeof body.lender === "string" ? body.lender : null,
      original_amount: body.original_amount,
      current_balance: body.current_balance,
      interest_rate: body.interest_rate,
      start_date: typeof body.start_date === "string" ? body.start_date : null,
      end_date: typeof body.end_date === "string" ? body.end_date : null,
      is_active: body.is_active !== false,
    });
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true, data: mortgage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create mortgage" });
  }
});

// PUT /api/mortgages/:id
router.put("/mortgages/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: Partial<PropertyMortgage> = {};
    if (body.lender !== undefined) updates.lender = typeof body.lender === "string" ? body.lender : null;
    if (typeof body.original_amount === "number") updates.original_amount = body.original_amount;
    if (typeof body.current_balance === "number") updates.current_balance = body.current_balance;
    if (typeof body.interest_rate === "number") updates.interest_rate = body.interest_rate;
    if (body.start_date !== undefined) updates.start_date = typeof body.start_date === "string" ? body.start_date : null;
    if (body.end_date !== undefined) updates.end_date = typeof body.end_date === "string" ? body.end_date : null;
    if (body.is_active != null) updates.is_active = Boolean(body.is_active);

    const mortgage = await updateMortgage(id, updates);
    if (!mortgage) {
      res.status(404).json({ success: false, error: "mortgage not found" });
      return;
    }
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true, data: mortgage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update mortgage" });
  }
});

// DELETE /api/mortgages/:id
router.delete("/mortgages/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const deleted = await deleteMortgage(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "mortgage not found" });
      return;
    }
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete mortgage" });
  }
});

// ============================================================
// Costs (nested under property)
// ============================================================

// GET /api/properties/:id/costs
router.get("/properties/:id/costs", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const property = await ensurePropertyOwnership(id, req.session.userId!);
    if (!property) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }
    const costs = await getCostsByProperty(id);
    res.json({ success: true, data: costs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to fetch costs" });
  }
});

// POST /api/properties/:id/costs
router.post("/properties/:id/costs", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const property = await ensurePropertyOwnership(id, req.session.userId!);
    if (!property) {
      res.status(404).json({ success: false, error: "property not found" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    if (typeof body.label !== "string" || !body.label.trim()) {
      res.status(400).json({ success: false, error: "label is required" });
      return;
    }
    const category = typeof body.category === "string" && VALID_COST_CATEGORIES.includes(body.category as PropertyCostCategory)
      ? (body.category as PropertyCostCategory)
      : "other";
    if (typeof body.amount !== "number" || body.amount < 0) {
      res.status(400).json({ success: false, error: "amount must be a non-negative number" });
      return;
    }
    const frequency = typeof body.frequency === "string" && VALID_FREQUENCIES.includes(body.frequency as IncomeFrequency)
      ? (body.frequency as IncomeFrequency)
      : "monthly";

    const cost = await createPropertyCost(id, {
      label: body.label.trim(),
      category,
      amount: body.amount,
      currency: typeof body.currency === "string" ? body.currency.toUpperCase() : property.currency,
      frequency,
      day_of_month: typeof body.day_of_month === "number" ? body.day_of_month : null,
      start_date: typeof body.start_date === "string" ? body.start_date : null,
      end_date: typeof body.end_date === "string" ? body.end_date : null,
      is_active: body.is_active !== false,
    });
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true, data: cost });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create cost" });
  }
});

// PUT /api/property-costs/:id
router.put("/property-costs/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const updates: Partial<PropertyCost> = {};
    if (typeof body.label === "string") updates.label = body.label.trim();
    if (typeof body.category === "string" && VALID_COST_CATEGORIES.includes(body.category as PropertyCostCategory)) {
      updates.category = body.category as PropertyCostCategory;
    }
    if (typeof body.amount === "number") updates.amount = body.amount;
    if (typeof body.currency === "string") updates.currency = body.currency.toUpperCase();
    if (typeof body.frequency === "string" && VALID_FREQUENCIES.includes(body.frequency as IncomeFrequency)) {
      updates.frequency = body.frequency as IncomeFrequency;
    }
    if (body.day_of_month !== undefined) updates.day_of_month = typeof body.day_of_month === "number" ? body.day_of_month : null;
    if (body.start_date !== undefined) updates.start_date = typeof body.start_date === "string" ? body.start_date : null;
    if (body.end_date !== undefined) updates.end_date = typeof body.end_date === "string" ? body.end_date : null;
    if (body.is_active != null) updates.is_active = Boolean(body.is_active);

    const cost = await updatePropertyCost(id, updates);
    if (!cost) {
      res.status(404).json({ success: false, error: "cost not found" });
      return;
    }
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true, data: cost });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update cost" });
  }
});

// DELETE /api/property-costs/:id
router.delete("/property-costs/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const deleted = await deletePropertyCost(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "cost not found" });
      return;
    }
    await writeWealthSnapshotSafe(req.session.userId!, "property");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete cost" });
  }
});

export default router;
// Silence unused-import warning for getPropertiesByUser which is kept for parity with other routers
void getPropertiesByUser;
