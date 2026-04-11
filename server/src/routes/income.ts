import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getIncomeStreamsByUser,
  createIncomeStream,
  updateIncomeStream,
  deleteIncomeStream,
  generateStreamTransactions,
  deleteTransactionsByStream,
  getTransactionsByUser,
  createTransaction,
  updateTransactionCategory,
  deleteTransaction,
} from "../lib/db.js";
import { categorize } from "../lib/categorize.js";
import { getExchangeRates } from "../lib/forex.js";
import type { IncomeStream, IncomeStreamType, IncomeFrequency } from "../types/index.js";

const router = Router();
router.use(requireAuth);

const VALID_TYPES: IncomeStreamType[] = ["salary", "dividend", "freelance", "pension", "interest", "rental", "other"];
const VALID_FREQUENCIES: IncomeFrequency[] = ["monthly", "quarterly", "yearly", "irregular"];

function validateStream(body: Record<string, unknown>): string | null {
  if (typeof body.name !== "string" || body.name.trim() === "") return "name is required";
  if (typeof body.type !== "string" || !VALID_TYPES.includes(body.type as IncomeStreamType)) return "invalid type";
  if (typeof body.amount !== "number" || body.amount <= 0) return "amount must be a positive number";
  if (typeof body.currency !== "string" || body.currency.length !== 3) return "currency must be a 3-letter code";
  if (typeof body.frequency !== "string" || !VALID_FREQUENCIES.includes(body.frequency as IncomeFrequency))
    return "invalid frequency";
  if (typeof body.start_date !== "string") return "start_date is required";
  return null;
}

// GET /api/income/streams
router.get("/income/streams", async (req: Request, res: Response) => {
  try {
    const streams = await getIncomeStreamsByUser(req.session.userId!);
    res.json({ success: true, data: streams });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to fetch streams" });
  }
});

// POST /api/income/streams
router.post("/income/streams", async (req: Request, res: Response) => {
  try {
    const err = validateStream(req.body);
    if (err) {
      res.status(400).json({ success: false, error: err });
      return;
    }

    const stream = await createIncomeStream(req.session.userId!, {
      name: String(req.body.name).trim(),
      type: req.body.type as IncomeStreamType,
      amount: Number(req.body.amount),
      currency: String(req.body.currency).toUpperCase(),
      frequency: req.body.frequency as IncomeFrequency,
      day_of_month: req.body.day_of_month != null ? Number(req.body.day_of_month) : null,
      start_date: String(req.body.start_date),
      end_date: req.body.end_date ? String(req.body.end_date) : null,
      is_active: req.body.is_active !== false,
      notes: req.body.notes ? String(req.body.notes) : null,
      property_id: req.body.property_id != null ? Number(req.body.property_id) : null,
    });

    // Auto-generate historical events
    const eventsCreated = await generateStreamTransactions(req.session.userId!, stream);

    res.json({ success: true, data: { stream, eventsCreated } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create stream" });
  }
});

// PUT /api/income/streams/:id
router.put("/income/streams/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }

    const updates: Partial<IncomeStream> = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.amount != null) updates.amount = Number(req.body.amount);
    if (req.body.currency != null) updates.currency = String(req.body.currency).toUpperCase();
    if (req.body.frequency != null) updates.frequency = req.body.frequency as IncomeFrequency;
    if (req.body.day_of_month !== undefined) updates.day_of_month = req.body.day_of_month != null ? Number(req.body.day_of_month) : null;
    if (req.body.start_date != null) updates.start_date = String(req.body.start_date);
    if (req.body.end_date !== undefined) updates.end_date = req.body.end_date ? String(req.body.end_date) : null;
    if (req.body.is_active != null) updates.is_active = Boolean(req.body.is_active);
    if (req.body.notes !== undefined) updates.notes = req.body.notes ? String(req.body.notes) : null;

    const stream = await updateIncomeStream(id, req.session.userId!, updates);
    if (!stream) {
      res.status(404).json({ success: false, error: "stream not found" });
      return;
    }

    // Regenerate past events if amount/schedule changed
    if (req.body.amount != null || req.body.frequency != null || req.body.start_date != null || req.body.day_of_month !== undefined) {
      await deleteTransactionsByStream(req.session.userId!, id);
      await generateStreamTransactions(req.session.userId!, stream);
    }

    res.json({ success: true, data: stream });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update stream" });
  }
});

// DELETE /api/income/streams/:id
router.delete("/income/streams/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const deleted = await deleteIncomeStream(id, req.session.userId!);
    if (!deleted) {
      res.status(404).json({ success: false, error: "stream not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete stream" });
  }
});

// GET /api/transactions — list transactions, optionally filtered
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const sign = req.query.sign === "income" || req.query.sign === "expense" ? req.query.sign : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const txs = await getTransactionsByUser(req.session.userId!, { sign, limit });
    res.json({ success: true, data: txs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to fetch transactions" });
  }
});

// POST /api/transactions — create a manual transaction
router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const body = req.body as Record<string, unknown>;

    if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      res.status(400).json({ success: false, error: "date must be YYYY-MM-DD" });
      return;
    }
    if (typeof body.amount !== "number" || body.amount === 0) {
      res.status(400).json({ success: false, error: "amount must be a non-zero number" });
      return;
    }
    if (typeof body.description !== "string" || !body.description.trim()) {
      res.status(400).json({ success: false, error: "description is required" });
      return;
    }

    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "USD";
    const description = body.description.trim();
    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : await categorize(description, body.amount);

    const rates = await getExchangeRates("USD");
    const amountUsd =
      currency === "USD" ? body.amount : rates[currency] ? body.amount / rates[currency] : null;

    const result = await createTransaction(userId, {
      source_type: "manual",
      source_id: null,
      date: body.date,
      amount: body.amount,
      currency,
      amount_usd: amountUsd,
      description,
      merchant: typeof body.merchant === "string" ? body.merchant : null,
      category,
    });

    if (!result) {
      res.status(409).json({ success: false, error: "duplicate transaction" });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to create transaction" });
  }
});

// PUT /api/transactions/:id — update category
router.put("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const category = typeof req.body.category === "string" ? req.body.category.trim() : "";
    if (!category) {
      res.status(400).json({ success: false, error: "category is required" });
      return;
    }
    const tx = await updateTransactionCategory(id, req.session.userId!, category);
    if (!tx) {
      res.status(404).json({ success: false, error: "transaction not found" });
      return;
    }
    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to update transaction" });
  }
});

// DELETE /api/transactions/:id
router.delete("/transactions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }
    const deleted = await deleteTransaction(id, req.session.userId!);
    if (!deleted) {
      res.status(404).json({ success: false, error: "transaction not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to delete transaction" });
  }
});

// GET /api/cashflow/summary?month=YYYY-MM
router.get("/cashflow/summary", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const monthParam = typeof req.query.month === "string" ? req.query.month : null;

    // Fetch all txs (small-scale app, fine for now)
    const all = await getTransactionsByUser(userId, { limit: 5000 });

    // Filter by month if requested. `t.date` may be a Date from pg or an ISO string.
    const dateToIso = (d: unknown): string => {
      if (typeof d === "string") return d.slice(0, 10);
      if (d instanceof Date) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
      return "";
    };

    const filtered = monthParam
      ? all.filter((t) => dateToIso(t.date).startsWith(monthParam))
      : all;

    const rates = await getExchangeRates("USD");
    const toUsd = (amount: number, ccy: string) =>
      ccy === "USD" ? amount : rates[ccy] ? amount / rates[ccy] : amount;

    let income = 0;
    let expenses = 0;
    const byCategory: Record<string, number> = {};
    const byMerchant: Record<string, number> = {};

    for (const tx of filtered) {
      const ccy = (tx.currency ?? "USD").toUpperCase();
      const usd = tx.amount_usd ?? toUsd(tx.amount, ccy);

      if (tx.amount > 0) income += usd;
      else expenses += Math.abs(usd);

      const category = tx.category ?? "Other";
      // Exclude transfers from both income and expense totals? Keep for summary but flag.
      if (tx.amount < 0) {
        byCategory[category] = (byCategory[category] ?? 0) + Math.abs(usd);
      }

      // Top merchants (expenses only)
      if (tx.amount < 0) {
        const m = tx.merchant ?? tx.description ?? "Unknown";
        byMerchant[m] = (byMerchant[m] ?? 0) + Math.abs(usd);
      }
    }

    const categories = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topMerchants = Object.entries(byMerchant)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const net = income - expenses;
    const savingsRate = income > 0 ? net / income : 0;

    res.json({
      success: true,
      data: {
        month: monthParam,
        income,
        expenses,
        net,
        savingsRate,
        transactionCount: filtered.length,
        categories,
        topMerchants,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to compute summary" });
  }
});

export default router;
