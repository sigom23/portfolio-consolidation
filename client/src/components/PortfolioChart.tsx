import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PortfolioSummary } from "../types";

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  stocks: { color: "#3b82f6", label: "Stocks" },
  crypto: { color: "#8b5cf6", label: "Crypto" },
  bonds: { color: "#14b8a6", label: "Bonds" },
  cash: { color: "#22c55e", label: "Cash" },
  other: { color: "#64748b", label: "Other" },
};

interface Props {
  summary: PortfolioSummary | undefined;
  loading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function PortfolioChart({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = Object.entries(summary?.breakdown ?? {})
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: CATEGORY_CONFIG[key]?.label ?? key,
      value,
      color: CATEGORY_CONFIG[key]?.color ?? "#64748b",
    }));

  const totalValue = summary?.totalValue ?? 0;
  const isEmpty = data.length === 0;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Asset Allocation</h2>

      {isEmpty ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No assets to display</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">Total</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
