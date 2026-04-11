import { useCurrency } from "../contexts/CurrencyContext";

export interface GeographyAllocation {
  name: string;
  value: number;
}

const REGION_COLORS: Record<string, string> = {
  "North America": "#3b82f6",
  Europe: "#8b5cf6",
  "Asia Pacific": "#14b8a6",
  "Emerging Markets": "#f59e0b",
  Unknown: "#64748b",
};

const REGION_FLAGS: Record<string, string> = {
  "North America": "\ud83c\uddfa\ud83c\uddf8",
  Europe: "\ud83c\uddea\ud83c\uddfa",
  "Asia Pacific": "\ud83c\uddef\ud83c\uddf5",
  "Emerging Markets": "\ud83c\udf0d",
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
  const { format } = useCurrency();

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center transition-colors">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = regions
    .filter((r) => r.value > 0 && r.name !== "Unknown")
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full transition-colors">
      <h2 className="text-sm font-medium text-[var(--text-muted)] mb-4">Geography</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">No stock holdings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((region, i) => {
            const pct = total > 0 ? (region.value / total) * 100 : 0;
            const color = getColor(region.name, i);
            const flag = REGION_FLAGS[region.name] ?? "\ud83c\udf10";

            return (
              <div key={region.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{flag}</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{region.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">{format(region.value)}</span>
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
