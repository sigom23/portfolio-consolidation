import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "../contexts/CurrencyContext";
import type { Holding } from "../types";

const CURRENCY_COLORS: Record<string, string> = {
  USD: "#1e3a5f",
  EUR: "#60a5fa",
  GBP: "#34d399",
  JPY: "#5eead4",
  CHF: "#818cf8",
  CAD: "#f472b6",
  AUD: "#fbbf24",
  HKD: "#a78bfa",
  CNY: "#fb923c",
  KRW: "#94a3b8",
};

function getColor(currency: string, index: number): string {
  if (CURRENCY_COLORS[currency]) return CURRENCY_COLORS[currency];
  const fallbacks = ["#7dd3fc", "#c4b5fd", "#86efac", "#fcd34d", "#f9a8d4", "#67e8f9"];
  return fallbacks[index % fallbacks.length];
}

interface Props {
  holdings: Holding[];
  loading: boolean;
}

export function CurrencyChart({ holdings, loading }: Props) {
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

  // Group holdings by currency
  const currencyMap = new Map<string, number>();
  for (const h of holdings) {
    const val = h.value_usd ?? 0;
    if (val <= 0) continue;
    const ccy = (h.currency ?? "USD").toUpperCase();
    currencyMap.set(ccy, (currencyMap.get(ccy) ?? 0) + val);
  }

  const sorted = [...currencyMap.entries()].sort((a, b) => b[1] - a[1]);

  // Show top currencies, group the rest as "Other"
  const MAX_SHOWN = 6;
  const top = sorted.slice(0, MAX_SHOWN);
  const rest = sorted.slice(MAX_SHOWN);
  if (rest.length > 0) {
    const otherTotal = rest.reduce((sum, [, v]) => sum + v, 0);
    top.push(["Other", otherTotal]);
  }

  const data = top.map(([name, value], i) => ({
    name,
    value,
    color: getColor(name, i),
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Currency Exposure</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No holdings</p>
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
                <p className="text-xs text-[var(--text-muted)]">Currency</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">Exposure</p>
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
