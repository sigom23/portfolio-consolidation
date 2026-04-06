import type { PortfolioSummary } from "../types";
import { useCurrency } from "../contexts/CurrencyContext";

const CATEGORIES: { key: keyof PortfolioSummary["breakdown"]; label: string; color: string }[] = [
  { key: "stocks", label: "Stocks", color: "#3b82f6" },
  { key: "crypto", label: "Crypto", color: "#8b5cf6" },
  { key: "bonds", label: "Bonds", color: "#14b8a6" },
  { key: "cash", label: "Cash", color: "#22c55e" },
  { key: "other", label: "Other", color: "#64748b" },
];

interface Props {
  summary: PortfolioSummary | undefined;
  loading: boolean;
}

export function BreakdownCards({ summary, loading }: Props) {
  const { format } = useCurrency();
  const total = summary?.totalValue ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CATEGORIES.map((cat) => {
        const value = summary?.breakdown[cat.key] ?? 0;
        const pct = total > 0 ? (value / total) * 100 : 0;

        return (
          <div
            key={cat.key}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-colors"
          >
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded" />
                <div className="h-5 w-20 bg-[var(--bg-tertiary)] rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{cat.label}</span>
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {format(value)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{pct.toFixed(1)}%</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
