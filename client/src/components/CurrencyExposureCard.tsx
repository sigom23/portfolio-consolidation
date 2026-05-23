import { motion } from "motion/react";
import { useMemo } from "react";
import { useHoldings } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";

const CURRENCY_COLORS = [
  "#6B7B8D",
  "#A89B8C",
  "#7D8E7B",
  "#8E87A5",
  "#9BA29D",
  "#A8957D",
  "#7D8B9E",
  "#9B8B7D",
];

export function CurrencyExposureCard() {
  const { data: holdings, isLoading } = useHoldings();
  const { format } = useCurrency();

  // Currency exposure across all asset classes, by trading currency.
  // Denominator is sum of gross asset value (USD) — answers "where is your money
  // sitting by currency", not "% of net worth". Mortgages are not currency-netted in v1.
  const rows = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];
    const byCcy = new Map<string, number>();
    for (const h of holdings) {
      const ccy = (h.currency ?? "USD").toUpperCase();
      byCcy.set(ccy, (byCcy.get(ccy) ?? 0) + (h.value_usd ?? 0));
    }
    const total = Array.from(byCcy.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Array.from(byCcy.entries())
      .map(([currency, valueUsd]) => ({
        currency,
        valueUsd,
        pct: (valueUsd / total) * 100,
      }))
      .sort((a, b) => b.valueUsd - a.valueUsd)
      .map((row, i) => ({ ...row, color: CURRENCY_COLORS[i % CURRENCY_COLORS.length] }));
  }, [holdings]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
      className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Currency Exposure</h2>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.12em]">% of gross assets</span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-4 leading-relaxed">
        Where your money sits by trading currency.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[var(--bg-tertiary)] rounded-[2px] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-24 rounded-[2px] bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No holdings to break down yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.currency}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-xs font-medium text-[var(--text-secondary)] tracking-[0.04em]">{row.currency}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] shrink-0">
                  <span className="tabular-nums">{format(row.valueUsd)}</span>
                  <span className="tabular-nums w-12 text-right">{row.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
