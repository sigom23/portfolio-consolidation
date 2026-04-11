import type { PortfolioSummary } from "../types";
import { useCurrency } from "../contexts/CurrencyContext";
import { motion } from "motion/react";

const CATEGORIES: { key: keyof PortfolioSummary["breakdown"]; label: string; color: string }[] = [
  { key: "stocks", label: "Stocks", color: "#3b82f6" },
  { key: "real_estate", label: "Real Estate", color: "#06b6d4" },
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

  // Only show categories that have value
  const activeCategories = loading
    ? CATEGORIES
    : CATEGORIES.filter((cat) => (summary?.breakdown[cat.key] ?? 0) > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {activeCategories.map((cat, i) => {
        const value = summary?.breakdown[cat.key] ?? 0;
        const pct = total > 0 ? (value / total) * 100 : 0;

        return (
          <motion.div
            key={cat.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 transition-colors cursor-default"
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
          </motion.div>
        );
      })}
    </div>
  );
}
