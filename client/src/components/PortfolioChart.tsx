import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { PortfolioSummary } from "../types";
import { useCurrency } from "../contexts/CurrencyContext";

const CATEGORY_CONFIG: { key: keyof PortfolioSummary["breakdown"]; label: string; color: string }[] = [
  { key: "stocks", label: "Stocks", color: "#6B7B8D" },
  { key: "real_estate", label: "Real Estate", color: "#7D8E7B" },
  { key: "crypto", label: "Crypto", color: "#A89B8C" },
  { key: "bonds", label: "Bonds", color: "#6E9E96" },
  { key: "cash", label: "Cash", color: "#6E9E96" },
  { key: "other", label: "Other", color: "#B8B8BD" },
];

interface Props {
  summary: PortfolioSummary | undefined;
  loading: boolean;
}

export function PortfolioChart({ summary, loading }: Props) {
  const { format, convert, symbol } = useCurrency();

  function formatShort(value: number): string {
    const converted = convert(value);
    if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
    if (converted >= 1_000) return `${symbol}${(converted / 1_000).toFixed(1)}K`;
    return `${symbol}${converted.toFixed(2)}`;
  }

  if (loading) {
    return (
      <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  const totalValue = summary?.totalValue ?? 0;
  const data = CATEGORY_CONFIG
    .map((cat) => ({
      name: cat.label,
      value: summary?.breakdown[cat.key] ?? 0,
      color: cat.color,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-sm font-medium text-[var(--text-muted)] mb-4">Asset Allocation</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-[2px] bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No assets to display</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative w-[180px] h-[180px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[27px] font-serif font-light text-[var(--text-primary)]">{formatShort(totalValue)}</p>
            </div>
          </div>

          {/* Data list */}
          <div className="flex-1 space-y-3">
            {data.map((entry) => {
              const pct = totalValue > 0 ? (entry.value / totalValue) * 100 : 0;
              return (
                <div key={entry.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">{format(entry.value)}</span>
                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: entry.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
