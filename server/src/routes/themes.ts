import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getThemesByUser,
  getThemeById,
  createTheme,
  updateTheme,
  ensureThemesSeeded,
  type NewTheme,
} from "../lib/db.js";

const router = Router();
router.use(requireAuth);

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

// GET /api/themes — list user themes. Lazy-seeds on first call so the user
// never lands in a 100% untagged state.
router.get("/themes", async (req: Request, res: Response) => {
  try {
    await ensureThemesSeeded(req.session.userId!);
    const themes = await getThemesByUser(req.session.userId!);
    res.json({ success: true, data: themes });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch themes",
    });
  }
});

// POST /api/themes — create a new theme
router.post("/themes", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = strOrNull(body.name);
    if (!name) {
      res.status(400).json({ success: false, error: "name is required" });
      return;
    }

    const data: NewTheme = {
      name,
      thesis: strOrNull(body.thesis),
      color: strOrNull(body.color),
    };

    const theme = await createTheme(req.session.userId!, data);
    res.json({ success: true, data: theme });
  } catch (err) {
    // Surface unique-name collisions as 409 instead of opaque 500
    if (err instanceof Error && /duplicate key|unique/i.test(err.message)) {
      res.status(409).json({ success: false, error: "A theme with that name already exists" });
      return;
    }
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to create theme",
    });
  }
});

// PATCH /api/themes/:id — rename / update thesis / update color
// (DELETE is intentionally absent in v1.1 — cascade question on tagged holdings.)
router.patch("/themes/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: "invalid id" });
      return;
    }

    const existing = await getThemeById(id, req.session.userId!);
    if (!existing) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const updates: Partial<NewTheme> = {};

    if (body.name !== undefined) {
      const name = strOrNull(body.name);
      if (!name) {
        res.status(400).json({ success: false, error: "name cannot be empty" });
        return;
      }
      updates.name = name;
    }
    if (body.thesis !== undefined) updates.thesis = strOrNull(body.thesis);
    if (body.color !== undefined) updates.color = strOrNull(body.color);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, error: "no valid fields to update" });
      return;
    }

    const updated = await updateTheme(id, req.session.userId!, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Error && /duplicate key|unique/i.test(err.message)) {
      res.status(409).json({ success: false, error: "A theme with that name already exists" });
      return;
    }
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update theme",
    });
  }
});

export default router;
