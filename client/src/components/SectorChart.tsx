import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "../contexts/CurrencyContext";
import type { SectorAllocation } from "../services/api";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3b82f6",
  "Financial Services": "#10b981",
  "Health Care": "#ef4444",
  "Consumer Defensive": "#f59e0b",
  "Consumer Cyclical": "#f97316",
  "Communication Services": "#8b5cf6",
  Industrials: "#6366f1",
  Energy: "#14b8a6",
  "Real Estate": "#ec4899",
  Utilities: "#84cc16",
  "Basic Materials": "#78716c",
  Unknown: "#94a3b8",
};

function getColor(sector: string, index: number): string {
  if (SECTOR_COLORS[sector]) return SECTOR_COLORS[sector];
  const fallbacks = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1", "#14b8a6", "#ec4899"];
  return fallbacks[index % fallbacks.length];
}

interface Props {
  sectors: SectorAllocation[];
  loading: boolean;
}

export function SectorChart({ sectors, loading }: Props) {
  const { convert, symbol } = useCurrency();

  function formatShort(value: number): string {
    const converted = convert(value);
    if (converted >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
    if (converted >= 1_000) return `${symbol}${(converted / 1_000).toFixed(1)}K`;
    return `${symbol}${converted.toFixed(2)}`;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = sectors
    .filter((s) => s.value > 0)
    .map((s, i) => ({
      name: s.name,
      value: s.value,
      color: getColor(s.name, i),
    }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Sector Allocation</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No stock holdings</p>
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
                  formatter={(value) => formatShort(Number(value))}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xs text-[var(--text-muted)]">Stocks</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{formatShort(total)}</p>
              </div>
            </div>
          </div>

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
