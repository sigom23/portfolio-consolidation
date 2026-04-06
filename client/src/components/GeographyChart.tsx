import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useCurrency } from "../contexts/CurrencyContext";

export interface GeographyAllocation {
  name: string;
  value: number;
}

const REGION_COLORS: Record<string, string> = {
  "North America": "#60a5fa",
  Europe: "#3b82f6",
  "Asia Pacific": "#1e3a5f",
  "Emerging Markets": "#94a3b8",
  Unknown: "#64748b",
};

function getColor(region: string, index: number): string {
  if (REGION_COLORS[region]) return REGION_COLORS[region];
  const fallbacks = ["#7dd3fc", "#a78bfa", "#86efac", "#fbbf24"];
  return fallbacks[index % fallbacks.length];
}

interface Props {
  regions: GeographyAllocation[];
  loading: boolean;
}

export function GeographyChart({ regions, loading }: Props) {
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

  const data = regions
    .filter((r) => r.value > 0 && r.name !== "Unknown")
    .map((r, i) => ({
      name: r.name,
      value: r.value,
      color: getColor(r.name, i),
    }));

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Geography / Region</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No stock holdings</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => formatShort(Number(value))}
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                  cursor={{ fill: "var(--bg-tertiary)", opacity: 0.5 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
