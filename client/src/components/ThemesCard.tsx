import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useHoldings, useProperties, useThemes } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import type { Theme } from "../types";

interface ThemeRow {
  themeId: number | null;
  theme: Theme | null;
  valueUsd: number;
  pct: number;
}

export function ThemesCard() {
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: properties } = useProperties();
  const { data: themes, isLoading: themesLoading } = useThemes();
  const { format, rates } = useCurrency();

  // Per-property mortgage balance in USD. Used to net real estate value at
  // the property level so the theme totals sum to net worth, not gross assets.
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

  const rows = useMemo<ThemeRow[]>(() => {
    if (!holdings || !themes) return [];

    const sums = new Map<number | null, number>();
    for (const h of holdings) {
      let value = h.value_usd ?? 0;
      // Real estate: subtract that property's mortgage, clamp at zero
      // (mirrors the My Wealth rule of not showing underwater equity as negative)
      if (h.asset_type === "real_estate" && h.source_type === "property" && h.source_id) {
        const mortgage = mortgageByProperty.get(h.source_id) ?? 0;
        value = Math.max(value - mortgage, 0);
      }
      const key = h.theme_id ?? null;
      sums.set(key, (sums.get(key) ?? 0) + value);
    }

    const total = Array.from(sums.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const tagged: ThemeRow[] = themes
      .map((t) => {
        const value = sums.get(t.id) ?? 0;
        return {
          themeId: t.id,
          theme: t,
          valueUsd: value,
          pct: (value / total) * 100,
        };
      })
      .filter((r) => r.valueUsd > 0)
      .sort((a, b) => b.valueUsd - a.valueUsd);

    const untagged = sums.get(null) ?? 0;
    if (untagged > 0) {
      tagged.push({
        themeId: null,
        theme: null,
        valueUsd: untagged,
        pct: (untagged / total) * 100,
      });
    }
    return tagged;
  }, [holdings, themes, mortgageByProperty]);

  const loading = holdingsLoading || themesLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
      className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Investment Themes</h2>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em]">% of net worth</span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
        The futures you're betting on, across every asset class.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[var(--bg-tertiary)] rounded-[2px] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-24 rounded-[2px] bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No themes yet — set them up in Settings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isUntagged = row.themeId === null;
            const color = row.theme?.color ?? "#9BA29D";
            const name = row.theme?.name ?? "Untagged";

            const inner = (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${isUntagged ? "border border-[var(--color-light)]" : ""}`}
                      style={isUntagged ? {} : { backgroundColor: color }}
                    />
                    <span
                      className={`text-xs font-medium tracking-[0.04em] truncate ${
                        isUntagged ? "text-[var(--text-muted)] italic" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] shrink-0">
                    <span className="tabular-nums">{format(row.valueUsd)}</span>
                    <span className="tabular-nums w-12 text-right">{row.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: isUntagged ? "var(--color-light)" : color,
                    }}
                  />
                </div>
              </div>
            );

            return (
              <Link
                key={isUntagged ? "untagged" : row.themeId!}
                to="/themes/$themeId"
                params={{ themeId: isUntagged ? "untagged" : String(row.themeId!) }}
                className="block hover:opacity-80 transition-opacity"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
