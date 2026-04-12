import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useCurrency } from "../contexts/CurrencyContext";
import type { SectorAllocation } from "../services/api";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#6B7B8D",
  "Financial Services": "#6E9E96",
  Healthcare: "#C47D6D",
  "Consumer Defensive": "#8E87A5",
  "Consumer Cyclical": "#C4A96D",
  "Communication Services": "#A89B8C",
  Industrials: "#8E87A5",
  Energy: "#6E9E96",
  "Real Estate": "#A89B8C",
  Utilities: "#7D8E7B",
  "Basic Materials": "#78716c",
  Unknown: "#94a3b8",
};

function getColor(sector: string, index: number): string {
  if (SECTOR_COLORS[sector]) return SECTOR_COLORS[sector];
  const fallbacks = ["#6B7B8D", "#6E9E96", "#8E87A5", "#C47D6D", "#A89B8C", "#8E87A5"];
  return fallbacks[index % fallbacks.length];
}

interface Props {
  sectors: SectorAllocation[];
  loading: boolean;
}

export function SectorChart({ sectors, loading }: Props) {
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

  const data = sectors
    .filter((s) => s.value > 0)
    .map((s, i) => ({
      name: s.name,
      value: s.value,
      color: getColor(s.name, i),
    }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-sm font-medium text-[var(--text-muted)] mb-4">Sector Allocation</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-[2px] bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No stock holdings</p>
        </div>
      ) : (
        <div className="flex items-start gap-6">
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
              <p className="text-[27px] font-serif font-light text-[var(--text-primary)]">{formatShort(total)}</p>
            </div>
          </div>

          {/* Sorted list */}
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((entry) => {
              const pct = total > 0 ? (entry.value / total) * 100 : 0;
              return (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1">{entry.name}</span>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] tabular-nums flex-shrink-0">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
