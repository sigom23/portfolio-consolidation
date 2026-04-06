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
} from "../lib/db.js";
import { parsePdf } from "../lib/pdf-parser.js";
import { lookupTickers } from "../lib/openfigi.js";
import { parseCsv } from "../lib/csv-parser.js";
import { getExchangeRates } from "../lib/forex.js";

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

    const uploadRecord = await createUpload(userId, originalname, fileType, buffer);

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

      // Enrich holdings with OpenFIGI data
      const tickers = created.filter((h) => h.ticker).map((h) => h.ticker!);
      const currencyMap = new Map<string, string>();
      for (const h of created) {
        if (h.ticker && h.currency) currencyMap.set(h.ticker.toUpperCase(), h.currency);
      }
      if (tickers.length > 0) {
        try {
          const figiData = await lookupTickers(tickers, currencyMap);
          for (const holding of created) {
            if (holding.ticker) {
              const figi = figiData.get(holding.ticker.toUpperCase());
              if (figi) {
                await updateHoldingFigi(holding.id, figi);
                Object.assign(holding, {
                  figi: figi.figi,
                  composite_figi: figi.compositeFIGI,
                  share_class_figi: figi.shareClassFIGI,
                  security_type: figi.securityType,
                  market_sector: figi.marketSector,
                  exch_code: figi.exchCode,
                });
              }
            }
          }
        } catch (figiErr) {
          console.warn("OpenFIGI enrichment failed:", figiErr);
        }
      }

      await updateUploadStatus(uploadRecord.id, "processed");

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

  res.json({ success: true, data: null });
});

export default router;
