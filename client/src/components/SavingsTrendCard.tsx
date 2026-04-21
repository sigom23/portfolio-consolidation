import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useCashFlowTrend } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import type { CashFlowTrendPoint } from "../services/api";

const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_LONG = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseMonth(key: string): { year: number; monthIdx: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, monthIdx: m - 1 };
}

function colorFor(rate: number): string {
  if (rate >= 0.2) return "var(--color-positive)";
  if (rate >= 0) return "var(--color-pending)";
  return "var(--color-negative)";
}

export function SavingsTrendCard({
  selectedMonth,
  onSelectMonth,
}: {
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
} = {}) {
  const { data: trend, isLoading } = useCashFlowTrend(12);
  const { format } = useCurrency();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = useMemo<CashFlowTrendPoint[]>(() => trend ?? [], [trend]);
  const selectedIdx = selectedMonth
    ? points.findIndex((p) => p.month === selectedMonth)
    : -1;
  const defaultIdx = selectedIdx >= 0 ? selectedIdx : points.length - 1;
  const activeIdx = hoverIdx ?? defaultIdx;
  const active = points[activeIdx];

  // Sparkline needs a vertical scale. Use [min, max] of savings rate (clamped
  // so a single bad month doesn't flatten everything else).
  const { rateMin, rateMax } = useMemo(() => {
    if (points.length === 0) return { rateMin: 0, rateMax: 1 };
    let mn = Infinity, mx = -Infinity;
    for (const p of points) {
      mn = Math.min(mn, p.savingsRate);
      mx = Math.max(mx, p.savingsRate);
    }
    // ensure zero is visible so bars and sparkline read correctly
    mn = Math.min(0, mn);
    mx = Math.max(0.2, mx);
    return { rateMin: mn, rateMax: mx };
  }, [points]);

  const chartHeight = 96;
  const chartPadTop = 8;
  const chartPadBottom = 4;
  const innerHeight = chartHeight - chartPadTop - chartPadBottom;

  const yFor = (rate: number) => {
    const range = rateMax - rateMin || 1;
    const ratio = (rate - rateMin) / range;
    return chartPadTop + (1 - ratio) * innerHeight;
  };
  const zeroY = yFor(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Savings Rate — Last 12 Months
          </p>
          {active && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {(() => {
                const { year, monthIdx } = parseMonth(active.month);
                return `${MONTHS_LONG[monthIdx]} ${year}`;
              })()}
            </p>
          )}
        </div>
        {active && (
          <div className="text-right">
            <p
              className="text-[27px] font-serif font-normal tracking-[-0.03em] tabular-nums"
              style={{ color: colorFor(active.savingsRate) }}
            >
              {(active.savingsRate * 100).toFixed(1)}%
            </p>
            <p
              className={`text-xs tabular-nums ${
                active.net >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"
              }`}
            >
              {active.net >= 0 ? "+" : "−"}
              {format(Math.abs(active.net))}
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-24 bg-[var(--bg-tertiary)] rounded-[2px] animate-pulse" />
      ) : points.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Not enough data yet.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${points.length * 40} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full block"
            style={{ height: chartHeight }}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* zero baseline */}
            <line
              x1={0}
              x2={points.length * 40}
              y1={zeroY}
              y2={zeroY}
              stroke="var(--color-whisper)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            {/* bars */}
            {points.map((p, i) => {
              const centerX = i * 40 + 20;
              const barW = 16;
              const top = Math.min(yFor(p.savingsRate), zeroY);
              const bottom = Math.max(yFor(p.savingsRate), zeroY);
              const barH = Math.max(bottom - top, 1);
              const isSelected = i === selectedIdx;
              const isHovered = i === hoverIdx;
              const hasData = p.income > 0;
              const rawColor = hasData ? colorFor(p.savingsRate) : "var(--color-whisper)";
              const opacity = !hasData ? 0.3 : isSelected ? 1 : isHovered ? 0.85 : 0.5;
              return (
                <g
                  key={p.month}
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => onSelectMonth?.(p.month)}
                  style={{ cursor: onSelectMonth ? "pointer" : "default" }}
                >
                  {/* selection underline */}
                  {isSelected && (
                    <rect
                      x={centerX - barW / 2 - 2}
                      y={chartHeight - 2}
                      width={barW + 4}
                      height={2}
                      fill="var(--color-charcoal)"
                    />
                  )}
                  {/* bar */}
                  <rect
                    x={centerX - barW / 2}
                    y={top}
                    width={barW}
                    height={barH}
                    rx={1}
                    fill={rawColor}
                    opacity={opacity}
                  />
                  {/* hover hit target */}
                  <rect
                    x={i * 40}
                    y={0}
                    width={40}
                    height={chartHeight}
                    fill="transparent"
                  />
                </g>
              );
            })}
            {/* sparkline threading the bar tops */}
            <polyline
              points={points
                .map((p, i) => `${i * 40 + 20},${yFor(p.savingsRate)}`)
                .join(" ")}
              fill="none"
              stroke="var(--color-charcoal)"
              strokeWidth={1.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.45}
            />
            {/* dots on the sparkline */}
            {points.map((p, i) => (
              <circle
                key={p.month}
                cx={i * 40 + 20}
                cy={yFor(p.savingsRate)}
                r={i === activeIdx ? 3 : 1.5}
                fill="var(--color-charcoal)"
                opacity={i === activeIdx ? 1 : 0.5}
              />
            ))}
          </svg>

          {/* month labels */}
          <div className="grid mt-1.5" style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}>
            {points.map((p, i) => {
              const { monthIdx } = parseMonth(p.month);
              const isActive = i === activeIdx;
              return (
                <span
                  key={p.month}
                  className={`text-center text-[10px] tabular-nums ${
                    isActive ? "text-[var(--color-charcoal)] font-medium" : "text-[var(--color-muted)]"
                  }`}
                >
                  {MONTHS_SHORT[monthIdx]}
                </span>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
