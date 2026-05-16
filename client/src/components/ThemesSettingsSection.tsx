import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { useThemes, useCreateTheme, useUpdateTheme } from "../hooks/usePortfolio";
import type { Theme } from "../types";

const PRESET_COLORS = [
  "#6B7B8D", // Core Equities (slate)
  "#A89B8C", // Real Assets (taupe)
  "#7D8E7B", // Defensive (sage)
  "#8E87A5", // Thematic Growth (mauve)
  "#A8957D", // Speculative (tan)
  "#9BA29D", // Neutral
  "#7D8B9E", // Cool gray-blue
  "#9B8B7D", // Warm brown
];

function ColorPalette({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-5 h-5 rounded-full transition-all ${
            value === c ? "ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] ring-[var(--color-charcoal)]" : ""
          }`}
          style={{ backgroundColor: c }}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

function ThemeRow({ theme, onEdit }: { theme: Theme; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--border-color)]/50 last:border-b-0 group">
      <div
        className="w-2 h-2 rounded-full mt-2 shrink-0"
        style={{ backgroundColor: theme.color ?? "#9BA29D" }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{theme.name}</h3>
        {theme.thesis && (
          <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{theme.thesis}</p>
        )}
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 p-1.5 text-[var(--color-mid)] hover:text-[var(--color-charcoal)] opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit"
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function ThemeEditRow({
  theme,
  onSave,
  onCancel,
  saving,
  error,
}: {
  theme: Theme;
  onSave: (name: string, thesis: string, color: string) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(theme.name);
  const [thesis, setThesis] = useState(theme.thesis ?? "");
  const [color, setColor] = useState(theme.color ?? PRESET_COLORS[0]);

  return (
    <div className="py-3 border-b border-[var(--border-color)]/50 last:border-b-0 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Theme name"
        className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)]"
      />
      <textarea
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="What future are you betting on? Why does this theme exist?"
        rows={3}
        className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)] resize-none"
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ColorPalette value={color} onChange={setColor} />
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-[2px] transition-colors"
          >
            <X className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim(), thesis.trim(), color)}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-charcoal)] text-white text-xs rounded-full hover:bg-[var(--color-dark)] disabled:opacity-50 transition-colors"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-[var(--color-negative)]">{error}</p>}
    </div>
  );
}

function AddThemeForm({
  onCreate,
  onCancel,
  saving,
  error,
}: {
  onCreate: (name: string, thesis: string, color: string) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [thesis, setThesis] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4 rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 space-y-3 overflow-hidden"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Theme name (e.g. AI Infrastructure)"
        autoFocus
        className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)]"
      />
      <textarea
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="What future are you betting on?"
        rows={3}
        className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)] resize-none"
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ColorPalette value={color} onChange={setColor} />
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-[2px] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(name.trim(), thesis.trim(), color)}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-charcoal)] text-white text-xs rounded-full hover:bg-[var(--color-dark)] disabled:opacity-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            {saving ? "Adding..." : "Add theme"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-[var(--color-negative)]">{error}</p>}
    </motion.div>
  );
}

export function ThemesSettingsSection() {
  const { data: themes, isLoading } = useThemes();
  const createMutation = useCreateTheme();
  const updateMutation = useUpdateTheme();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(name: string, thesis: string, color: string) {
    setError(null);
    try {
      await createMutation.mutateAsync({ name, thesis: thesis || null, color });
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create theme");
    }
  }

  async function handleUpdate(id: number, name: string, thesis: string, color: string) {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        updates: { name, thesis: thesis || null, color },
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  }

  return (
    <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 mb-6 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[18px] font-normal text-[var(--text-primary)]">Investment Themes</h2>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-mid)] hover:text-[var(--color-charcoal)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add theme
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
        The futures you're betting on. Themes span every asset class — a single theme can contain liquid stocks, crypto, and illiquid bets. Rename or refine these as your view sharpens.
      </p>

      <AnimatePresence>
        {showAdd && (
          <AddThemeForm
            onCreate={handleCreate}
            onCancel={() => { setShowAdd(false); setError(null); }}
            saving={createMutation.isPending}
            error={showAdd ? error : null}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 bg-[var(--bg-tertiary)] rounded-[2px] animate-pulse" />
          ))}
        </div>
      ) : !themes || themes.length === 0 ? (
        <div className="text-sm text-[var(--text-muted)] py-4 text-center">
          No themes yet. Add one above to get started.
        </div>
      ) : (
        <div>
          {themes.map((t) =>
            editingId === t.id ? (
              <ThemeEditRow
                key={t.id}
                theme={t}
                onSave={(name, thesis, color) => handleUpdate(t.id, name, thesis, color)}
                onCancel={() => { setEditingId(null); setError(null); }}
                saving={updateMutation.isPending}
                error={editingId === t.id ? error : null}
              />
            ) : (
              <ThemeRow
                key={t.id}
                theme={t}
                onEdit={() => { setEditingId(t.id); setError(null); }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
