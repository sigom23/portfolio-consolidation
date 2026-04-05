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
  createHolding,
  getHoldingsByUpload,
} from "../lib/db.js";
import { parsePdf } from "../lib/pdf-parser.js";
import { parseCsv } from "../lib/csv-parser.js";

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

    const uploadRecord = createUpload(userId, originalname, fileType);

    try {
      const holdings = isPdf ? await parsePdf(buffer) : parseCsv(buffer);

      const created = holdings.map((h) => createHolding(userId, uploadRecord.id, h));

      updateUploadStatus(uploadRecord.id, "processed");

      res.json({
        success: true,
        data: {
          upload: { ...uploadRecord, status: "processed" },
          holdings: created,
        },
      });
    } catch (parseError) {
      updateUploadStatus(uploadRecord.id, "failed");
      const message = parseError instanceof Error ? parseError.message : "Parsing failed";
      res.status(422).json({ success: false, error: `Failed to parse file: ${message}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/uploads — list user's uploads
router.get("/", (req: Request, res: Response) => {
  const uploads = getUploadsByUser(req.session.userId!);
  res.json({ success: true, data: uploads });
});

// GET /api/uploads/:id — get upload with its holdings
router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid upload ID" });
    return;
  }

  const upload = getUploadById(id);
  if (!upload || upload.user_id !== req.session.userId!) {
    res.status(404).json({ success: false, error: "Upload not found" });
    return;
  }

  const holdings = getHoldingsByUpload(id);
  res.json({ success: true, data: { upload, holdings } });
});

// DELETE /api/uploads/:id — delete upload and its holdings
router.delete("/:id", (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: "Invalid upload ID" });
    return;
  }

  const deleted = deleteUpload(id, req.session.userId!);
  if (!deleted) {
    res.status(404).json({ success: false, error: "Upload not found" });
    return;
  }

  res.json({ success: true, data: null });
});

export default router;
