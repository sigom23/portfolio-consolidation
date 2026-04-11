import { useCurrency } from "../contexts/CurrencyContext";
import type { Holding } from "../types";

const CURRENCY_COLORS: Record<string, string> = {
  USD: "#3b82f6",
  EUR: "#8b5cf6",
  GBP: "#14b8a6",
  CHF: "#f59e0b",
  JPY: "#ef4444",
  CAD: "#22c55e",
  AUD: "#06b6d4",
  HKD: "#ec4899",
  CNY: "#f97316",
  KRW: "#64748b",
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "\ud83c\uddfa\ud83c\uddf8",
  EUR: "\ud83c\uddea\ud83c\uddfa",
  GBP: "\ud83c\uddec\ud83c\udde7",
  CHF: "\ud83c\udde8\ud83c\udded",
  JPY: "\ud83c\uddef\ud83c\uddf5",
  CAD: "\ud83c\udde8\ud83c\udde6",
  AUD: "\ud83c\udde6\ud83c\uddfa",
  HKD: "\ud83c\udded\ud83c\uddf0",
  CNY: "\ud83c\udde8\ud83c\uddf3",
  KRW: "\ud83c\uddf0\ud83c\uddf7",
};

function getColor(currency: string, index: number): string {
  if (CURRENCY_COLORS[currency]) return CURRENCY_COLORS[currency];
  const fallbacks = ["#7dd3fc", "#c4b5fd", "#86efac", "#fcd34d", "#f9a8d4"];
  return fallbacks[index % fallbacks.length];
}

interface Props {
  holdings: Holding[];
  loading: boolean;
}

export function CurrencyChart({ holdings, loading }: Props) {
  const { format, rateVsBase, baseCurrency } = useCurrency();

  function formatRate(rate: number): string {
    if (rate >= 100) return rate.toFixed(2);
    if (rate >= 1) return rate.toFixed(4);
    return rate.toFixed(5);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group holdings by currency
  const currencyMap = new Map<string, number>();
  for (const h of holdings) {
    const val = h.value_usd ?? 0;
    if (val <= 0) continue;
    const ccy = (h.currency ?? "USD").toUpperCase();
    currencyMap.set(ccy, (currencyMap.get(ccy) ?? 0) + val);
  }

  const sorted = [...currencyMap.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Currencies & FX Rates</h2>
        <span className="text-[10px] text-[var(--text-muted)]">vs {baseCurrency}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No holdings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(([ccy, value], i) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            const color = getColor(ccy, i);
            const flag = CURRENCY_FLAGS[ccy] ?? "";
            const rate = rateVsBase(ccy);

            return (
              <div key={ccy}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {flag && <span className="text-sm">{flag}</span>}
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{ccy}</span>
                    {ccy !== baseCurrency && (
                      <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums">
                        {formatRate(rate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">{format(value)}</span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
