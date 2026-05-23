import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { useThemes, useCreateTheme, useUpdateHoldingTheme } from "../hooks/usePortfolio";

interface ThemePickerProps {
  holdingId: number;
  currentThemeId: number | null;
  compact?: boolean;
}

export function ThemePicker({ holdingId, currentThemeId, compact = false }: ThemePickerProps) {
  const { data: themes } = useThemes();
  const updateMutation = useUpdateHoldingTheme();
  const createMutation = useCreateTheme();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentTheme = themes?.find((t) => t.id === currentThemeId);

  const filtered = useMemo(() => {
    if (!themes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return themes;
    return themes.filter((t) => t.name.toLowerCase().includes(q));
  }, [themes, search]);

  const trimmed = search.trim();
  const exactMatch =
    trimmed.length > 0 && themes?.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;

  const busy = updateMutation.isPending || createMutation.isPending;

  async function selectTheme(themeId: number | null) {
    if (busy) return;
    try {
      await updateMutation.mutateAsync({ holdingId, themeId });
      setOpen(false);
      setSearch("");
    } catch {
      // silent — leave open for the user to retry; mutation surface error elsewhere if needed
    }
  }

  async function createAndTag() {
    if (busy || !trimmed) return;
    try {
      const newTheme = await createMutation.mutateAsync({
        name: trimmed,
        thesis: null,
        color: null,
      });
      await updateMutation.mutateAsync({ holdingId, themeId: newTheme.id });
      setOpen(false);
      setSearch("");
    } catch {
      // silent
    }
  }

  const triggerPad = compact ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={busy}
        className={`flex items-center gap-1.5 ${triggerPad} rounded-full text-[11px] transition-colors border ${
          currentTheme
            ? "border-[var(--color-whisper)] text-[var(--text-secondary)] hover:border-[var(--color-mid)]"
            : "border-dashed border-[var(--color-whisper)] text-[var(--text-muted)] hover:border-[var(--color-mid)] hover:text-[var(--text-secondary)]"
        } ${busy ? "opacity-60" : ""}`}
      >
        {currentTheme ? (
          <>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: currentTheme.color ?? "#9BA29D" }}
            />
            <span className="max-w-[140px] truncate">{currentTheme.name}</span>
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            <span>Tag</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 right-0 rounded-[2px] border border-[var(--border-color)] bg-white shadow-md py-2">
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreate) createAndTag();
              else if (e.key === "Escape") {
                setOpen(false);
                setSearch("");
              }
            }}
            placeholder="Search or create..."
            className="w-full px-3 py-1.5 text-xs border-b border-[var(--border-color)] focus:outline-none placeholder:text-[var(--text-muted)]"
          />
          <div className="max-h-56 overflow-y-auto">
            {currentThemeId !== null && (
              <button
                type="button"
                onClick={() => selectTheme(null)}
                disabled={busy}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-muted)] italic hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
                Remove tag
              </button>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTheme(t.id)}
                disabled={busy}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-left ${
                  t.id === currentThemeId ? "bg-[var(--bg-tertiary)]/50" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.color ?? "#9BA29D" }}
                />
                <span className="text-[var(--text-secondary)] truncate">{t.name}</span>
                {t.id === currentThemeId && (
                  <Check className="w-3 h-3 ml-auto text-[var(--color-positive)] shrink-0" strokeWidth={1.5} />
                )}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onClick={createAndTag}
                disabled={busy}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-left border-t border-[var(--border-color)]/50"
              >
                <Plus className="w-3 h-3 shrink-0" strokeWidth={1.5} />
                <span className="text-[var(--text-secondary)] truncate">
                  Create "<span className="font-medium">{trimmed}</span>"
                </span>
              </button>
            )}
            {filtered.length === 0 && !showCreate && !currentThemeId && (
              <p className="px-3 py-3 text-xs text-[var(--text-muted)] text-center">
                No themes yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
