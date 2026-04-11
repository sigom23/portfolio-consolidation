import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  createUpload,
  updateUploadStatus,
  getUploadsByUser,
  getUploadById,
  deleteUpload,
  createHoldingFromUpload,
  getHoldingsByUpload,
  getUploadFileData,
  updateHoldingFigi,
  updateHoldingCurrency,
  createTransaction,
} from "../lib/db.js";
import { parsePdf } from "../lib/pdf-parser.js";
import { lookupSecurities } from "../lib/openfigi.js";
import { parseCsv } from "../lib/csv-parser.js";
import { writeWealthSnapshotSafe } from "../lib/snapshots.js";
import { getExchangeRates } from "../lib/forex.js";
import { getCompanyProfile } from "../lib/fmp.js";
import { parseTransactionCsv } from "../lib/transaction-csv-parser.js";
import { parseTransactionPdf } from "../lib/transaction-pdf-parser.js";
import { categorize } from "../lib/categorize.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/csv", "application/vnd.ms-excel"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and CSV files are allowed"));
    }
  },
});

// POST /api/uploads — upload and parse a statement
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file provided" });
      return;
    }

    const userId = req.session.userId!;
    const { originalname, mimetype, buffer } = req.file;
    const isPdf = mimetype === "application/pdf";
    const fileType = isPdf ? "pdf" : "csv";

    const rawKind = String(req.body.kind ?? "wealth").toLowerCase();
    const kind: "wealth" | "transactions" = rawKind === "transactions" ? "transactions" : "wealth";

    const uploadRecord = await createUpload(userId, originalname, fileType, buffer, kind);

    // Transactions branch ------------------------------------------------
    if (kind === "transactions") {
      try {
        const parsed = isPdf ? await parseTransactionPdf(buffer) : parseTransactionCsv(buffer);

        const rates = await getExchangeRates("USD");
        let inserted = 0;
        let duplicates = 0;
        for (const tx of parsed) {
          const ccy = tx.currency.toUpperCase();
          const amountUsd = ccy === "USD" ? tx.amount : rates[ccy] ? tx.amount / rates[ccy] : null;
          const category = await categorize(tx.description, tx.amount);
          const result = await createTransaction(userId, {
            source_type: "upload",
            source_id: String(uploadRecord.id),
            date: tx.date,
            amount: tx.amount,
            currency: ccy,
            amount_usd: amountUsd,
            description: tx.description,
            merchant: tx.merchant,
            category,
          });
          if (result) inserted++;
          else duplicates++;
        }

        await updateUploadStatus(uploadRecord.id, "processed");
        await writeWealthSnapshotSafe(userId, "upload");

        res.json({
          success: true,
          data: {
            upload: { ...uploadRecord, status: "processed" },
            kind: "transactions",
            parsed: parsed.length,
            inserted,
            duplicates,
          },
        });
        return;
      } catch (parseError) {
        await updateUploadStatus(uploadRecord.id, "failed");
        const message = parseError instanceof Error ? parseError.message : "Parsing failed";
        res.status(422).json({ success: false, error: `Failed to parse transactions: ${message}` });
        return;
      }
    }

    // Wealth branch (existing) --------------------------------------------
    try {
      const holdings = isPdf ? await parsePdf(buffer) : parseCsv(buffer);

      // Convert parsed values to USD
      const rates = await getExchangeRates("USD");
      for (const h of holdings) {
        const ccy = (h.currency ?? "USD").toUpperCase();
        if (ccy !== "USD" && rates[ccy] && h.value_usd) {
          h.value_usd = h.value_usd / rates[ccy];
        }
      }

      const created = await Promise.all(
        holdings.map((h) => createHoldingFromUpload(userId, uploadRecord.id, h))
      );

      // Enrich listed instruments with OpenFIGI data (prefer ISIN for accurate identification)
      const lookupItems = created
        .filter((h) => h.asset_type !== "crypto" && h.asset_type !== "cash" && (h.isin || h.ticker))
        .map((h) => ({ isin: h.isin, ticker: h.ticker, currency: h.currency }));
      if (lookupItems.length > 0) {
        try {
          const figiData = await lookupSecurities(lookupItems);
          for (const holding of created) {
            // Match by ISIN first, then by ticker
            const key = holding.isin?.toUpperCase() ?? holding.ticker?.toUpperCase();
            if (!key) continue;
            const figi = figiData.get(key);
            if (figi) {
              // Use OpenFIGI's ticker if the holding doesn't have one
              const tickerUpdate = !holding.ticker && figi.ticker ? figi.ticker : undefined;
              await updateHoldingFigi(holding.id, { ...figi, ticker: tickerUpdate });
              Object.assign(holding, {
                figi: figi.figi,
                composite_figi: figi.compositeFIGI,
                share_class_figi: figi.shareClassFIGI,
                security_type: figi.securityType,
                market_sector: figi.marketSector,
                exch_code: figi.exchCode,
              });
              if (tickerUpdate) holding.ticker = tickerUpdate;
            }
          }
        } catch (figiErr) {
          console.warn("OpenFIGI enrichment failed:", figiErr);
        }
      }

      // Set each stock's currency to its trading currency from FMP
      for (const holding of created) {
        if (!holding.ticker || holding.asset_type === "crypto" || holding.asset_type === "cash") continue;
        try {
          const profile = await getCompanyProfile(holding.ticker, holding.exch_code ?? undefined);
          if (profile?.currency) {
            await updateHoldingCurrency(holding.id, profile.currency);
            holding.currency = profile.currency;
          }
        } catch {
          // FMP lookup failed, keep original currency
        }
      }

      await updateUploadStatus(uploadRecord.id, "processed");
      await writeWealthSnapshotSafe(userId, "upload");

      res.json({
        success: true,
        data: {
          upload: { ...uploadRecord, status: "processed" },
          holdings: created,
        },
      });
    } catch (parseError) {
      await updateUploadStatus(uploadRecord.id, "failed");
      const message = parseError instanceof Error ? parseError.message : "Parsing failed";
      res.status(422).json({ success: false, error: `Failed to parse file: ${message}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/uploads — list user's uploads
router.get("/", async (req: Request, res: Response) => {
  const uploads = await getUploadsByUser(req.session.userId!);
  res.json({ success: true, data: uploads });
});

// GET /api/uploads/:id — get upload with its holdings
router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid upload ID" });
    return;
  }

  const uploadRecord = await getUploadById(id);
  if (!uploadRecord || uploadRecord.user_id !== req.session.userId!) {
    res.status(404).json({ success: false, error: "Upload not found" });
    return;
  }

  const holdings = await getHoldingsByUpload(id);
  res.json({ success: true, data: { upload: uploadRecord, holdings } });
});

// GET /api/uploads/:id/download — download the original file
router.get("/:id/download", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid upload ID" });
    return;
  }

  const file = await getUploadFileData(id, req.session.userId!);
  if (!file) {
    res.status(404).json({ success: false, error: "File not found" });
    return;
  }

  const contentType = file.file_type === "pdf" ? "application/pdf" : "text/csv";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
  res.send(file.file_data);
});

// DELETE /api/uploads/:id — delete upload and its holdings
router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid upload ID" });
    return;
  }

  const deleted = await deleteUpload(id, req.session.userId!);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Upload not found" });
    return;
  }

  await writeWealthSnapshotSafe(req.session.userId!, "upload");
  res.json({ success: true, data: null });
});

export default router;
