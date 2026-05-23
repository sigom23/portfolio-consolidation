import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings, useProperties, useThemes, useUpdateTheme } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";
import type { Holding } from "../types";

type AssetGroupKey = "liquid" | "illiquid" | "real_estate" | "crypto";

const GROUP_ORDER: AssetGroupKey[] = ["liquid", "illiquid", "real_estate", "crypto"];

const GROUP_LABELS: Record<AssetGroupKey, string> = {
  liquid: "Liquid",
  illiquid: "Illiquid",
  real_estate: "Real Estate",
  crypto: "Crypto",
};

function groupFor(h: Holding): AssetGroupKey {
  const t = (h.asset_type ?? "").toLowerCase();
  if (t === "crypto") return "crypto";
  if (t === "real_estate") return "real_estate";
  if (t === "illiquid") return "illiquid";
  return "liquid";
}

function ThemeDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = Route.useParams();
  const isUntaggedView = params.themeId === "untagged";
  // For untagged view, the filter key is null — matches holdings with no theme_id.
  const targetThemeId: number | null = isUntaggedView ? null : parseInt(params.themeId, 10);

  const { data: themes, isLoading: themesLoading } = useThemes();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: properties } = useProperties();
  const { format, baseCurrency, flag, rates } = useCurrency();
  const updateMutation = useUpdateTheme();

  const [editing, setEditing] = useState(false);
  const [draftThesis, setDraftThesis] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/" });
  }, [authLoading, user, navigate]);

  const theme = useMemo(
    () => (isUntaggedView ? null : themes?.find((t) => t.id === targetThemeId)),
    [themes, targetThemeId, isUntaggedView]
  );

  // Per-property mortgage in USD, matches the rule on My Wealth + ThemesCard
  const mortgageByProperty = useMemo(() => {
    const m = new Map<string, number>();
    if (!properties) return m;
    for (const p of properties) {
      const ccy = p.currency.toUpperCase();
      const balanceUsd =
        ccy === "USD" || !rates[ccy]
          ? p.total_mortgage_balance
          : p.total_mortgage_balance / rates[ccy];
      m.set(String(p.id), balanceUsd);
    }
    return m;
  }, [properties, rates]);

  // Holdings tagged into this theme (or untagged when targetThemeId is null),
  // with real-estate values net of mortgage so totals match net worth math.
  const themedHoldings = useMemo(() => {
    if (!holdings) return [];
    return holdings
      .filter((h) => (h.theme_id ?? null) === targetThemeId)
      .map((h) => {
        let value = h.value_usd ?? 0;
        if (h.asset_type === "real_estate" && h.source_type === "property" && h.source_id) {
          const mortgage = mortgageByProperty.get(h.source_id) ?? 0;
          value = Math.max(value - mortgage, 0);
        }
        return { holding: h, valueUsd: value };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [holdings, targetThemeId, mortgageByProperty]);

  // Net worth across the whole portfolio for the % allocation in the hero
  const netWorthUsd = useMemo(() => {
    if (!holdings) return 0;
    let total = 0;
    for (const h of holdings) {
      let v = h.value_usd ?? 0;
      if (h.asset_type === "real_estate" && h.source_type === "property" && h.source_id) {
        const m = mortgageByProperty.get(h.source_id) ?? 0;
        v = Math.max(v - m, 0);
      }
      total += v;
    }
    return total;
  }, [holdings, mortgageByProperty]);

  const themeTotalUsd = themedHoldings.reduce((sum, r) => sum + r.valueUsd, 0);
  const themePct = netWorthUsd > 0 ? (themeTotalUsd / netWorthUsd) * 100 : 0;

  const grouped = useMemo(() => {
    const g: Record<AssetGroupKey, typeof themedHoldings> = {
      liquid: [],
      illiquid: [],
      real_estate: [],
      crypto: [],
    };
    for (const row of themedHoldings) {
      g[groupFor(row.holding)].push(row);
    }
    return g;
  }, [themedHoldings]);

  function startEdit() {
    setDraftThesis(theme?.thesis ?? "");
    setEditing(true);
    setSaveError(null);
  }

  async function saveEdit() {
    if (!theme) return;
    setSaveError(null);
    try {
      await updateMutation.mutateAsync({
        id: theme.id,
        updates: { thesis: draftThesis.trim() || null },
      });
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save thesis");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isUntaggedView && themesLoading && !theme) {
    return (
      <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
        <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse mb-6" />
        <div className="h-32 bg-[var(--bg-tertiary)] rounded animate-pulse" />
      </div>
    );
  }

  if (!isUntaggedView && !theme) {
    return (
      <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
        <Link
          to="/my-wealth"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-mid)] hover:text-[var(--color-charcoal)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
          My Wealth
        </Link>
        <p className="text-[var(--text-muted)] italic font-serif">Theme not found.</p>
      </div>
    );
  }

  const swatch = theme?.color ?? "#9BA29D";
  const displayName = isUntaggedView ? "Untagged" : theme!.name;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      {/* Back link */}
      <Link
        to="/my-wealth"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-mid)] hover:text-[var(--color-charcoal)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
        My Wealth
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-8 mb-6"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {isUntaggedView ? (
              <div className="w-3 h-3 rounded-full shrink-0 border border-[var(--color-light)]" />
            ) : (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch }} />
            )}
            <h1 className="text-[38px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)] truncate">
              {displayName}
            </h1>
          </div>
          <span className="text-xs text-[var(--text-muted)] shrink-0 mt-3">{flag} {baseCurrency}</span>
        </div>

        {/* For untagged: a calm explainer instead of an editable thesis */}
        {isUntaggedView ? (
          <p className="text-[15.7px] text-[var(--text-secondary)] leading-relaxed mb-6 font-light italic">
            Holdings that don't yet belong to any theme. Most are liquid positions where the
            thesis is still yours to decide.
          </p>
        ) : editing ? (
          <div className="space-y-3 mb-4">
            <textarea
              value={draftThesis}
              onChange={(e) => setDraftThesis(e.target.value)}
              placeholder="What future are you betting on?"
              rows={4}
              autoFocus
              className="w-full px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setEditing(false); setSaveError(null); }}
                className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-[2px] transition-colors"
              >
                <X className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-charcoal)] text-white text-xs rounded-full hover:bg-[var(--color-dark)] disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
            {saveError && <p className="text-xs text-[var(--color-negative)]">{saveError}</p>}
          </div>
        ) : (
          <div className="group flex items-start gap-3 mb-6">
            <p className="text-[15.7px] text-[var(--text-secondary)] leading-relaxed flex-1 font-light">
              {theme!.thesis ?? (
                <span className="italic text-[var(--text-muted)]">No thesis yet — describe the future you're betting on here.</span>
              )}
            </p>
            <button
              onClick={startEdit}
              className="shrink-0 p-1.5 text-[var(--color-mid)] hover:text-[var(--color-charcoal)] opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit thesis"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Allocation hero */}
        <div className="flex items-baseline gap-6 flex-wrap">
          <div>
            <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
              Allocation
            </p>
            <p className="text-[38px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)] tabular-nums">
              {format(themeTotalUsd)}
            </p>
          </div>
          <div>
            <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
              % of net worth
            </p>
            <p className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-secondary)] tabular-nums">
              {themePct.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
              Holdings
            </p>
            <p className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-secondary)] tabular-nums">
              {themedHoldings.length}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Holdings grouped by asset class */}
      {holdingsLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 bg-[var(--bg-tertiary)] rounded-[2px] animate-pulse" />
          ))}
        </div>
      ) : themedHoldings.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-10 text-center">
          <p className="text-[var(--text-muted)] italic font-serif text-lg">
            {isUntaggedView
              ? "Every holding is themed. Nice."
              : "No holdings tagged here yet — use the theme picker on any asset page."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((groupKey, i) => (
            <motion.section
              key={groupKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
              className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <div className="px-6 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <h2 className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {GROUP_LABELS[groupKey]}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {format(grouped[groupKey].reduce((s, r) => s + r.valueUsd, 0))}
                </p>
              </div>
              <div className="divide-y divide-[var(--border-color)]/50">
                {grouped[groupKey].map(({ holding, valueUsd }) => (
                  <div
                    key={holding.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{holding.name}</p>
                      {holding.ticker && (
                        <p className="text-[11px] text-[var(--text-muted)] uppercase">{holding.ticker}</p>
                      )}
                    </div>
                    <p className="text-sm font-serif text-[var(--color-charcoal)] tabular-nums shrink-0 ml-3">
                      {format(valueUsd)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/themes/$themeId",
  component: ThemeDetailPage,
});
