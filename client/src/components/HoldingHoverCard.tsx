import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { fetchCompanyProfile, fetchPriceHistory, type CompanyProfile, type HistoricalPrice } from "../services/api";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis } from "recharts";

interface FigiData {
  figi?: string | null;
  composite_figi?: string | null;
  share_class_figi?: string | null;
  security_type?: string | null;
  market_sector?: string | null;
  exch_code?: string | null;
}

interface Props {
  ticker: string;
  exchCode?: string | null;
  figiData?: FigiData;
  children: React.ReactNode;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function formatNativePrice(value: number, currency?: string): string {
  try {
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `${currency || "$"} ${value.toFixed(2)}`;
  }
}

const profileCache = new Map<string, CompanyProfile>();
const historyCache = new Map<string, HistoricalPrice[]>();

export function HoldingHoverCard({ ticker, exchCode, figiData, children }: Props) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [history, setHistory] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openAbove: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);

  const cacheKey = exchCode ? `${ticker.toUpperCase()}.${exchCode.toUpperCase()}` : ticker.toUpperCase();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const openAbove = rect.bottom + 450 > window.innerHeight;
        setCoords({
          top: openAbove ? rect.top : rect.bottom + 4,
          left: rect.left,
          openAbove,
        });
      }

      setVisible(true);

      if (profileCache.has(cacheKey)) {
        setProfile(profileCache.get(cacheKey)!);
      } else {
        setLoading(true);
        fetchCompanyProfile(ticker, exchCode ?? undefined).then((p) => {
          if (p) {
            profileCache.set(cacheKey, p);
            setProfile(p);
          }
          setLoading(false);
        });
      }

      if (historyCache.has(cacheKey)) {
        setHistory(historyCache.get(cacheKey)!);
      } else {
        fetchPriceHistory(ticker, exchCode ?? undefined).then((h) => {
          historyCache.set(cacheKey, h);
          setHistory(h);
        });
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const chartColor = history.length >= 2 && history[history.length - 1].price >= history[0].price
    ? "#22c55e"
    : "#ef4444";

  const hasChart = history.length > 1;
  const cardWidth = hasChart ? "w-[38rem]" : "w-80";
  const maxLeftOffset = hasChart ? 608 : 340;

  const card = visible ? createPortal(
    <div
      className={`fixed z-[9999] ${cardWidth} rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl p-4 overflow-y-auto`}
      style={{
        top: coords.openAbove ? undefined : coords.top,
        bottom: coords.openAbove ? window.innerHeight - coords.top + 4 : undefined,
        left: Math.min(coords.left, window.innerWidth - maxLeftOffset),
        maxHeight: coords.openAbove ? coords.top - 8 : window.innerHeight - coords.top - 8,
      }}
      onMouseEnter={() => clearTimeout(timeoutRef.current)}
      onMouseLeave={handleMouseLeave}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : profile ? (
        <div className={hasChart ? "flex gap-4" : "space-y-3"}>
          {/* Left column: info */}
          <div className={`space-y-3 ${hasChart ? "w-60 shrink-0" : ""}`}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <img
                src={profile.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-tertiary)]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{profile.companyName}</p>
                <p className="text-xs text-[var(--text-muted)]">{profile.exchange} · {profile.symbol}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
                {formatNativePrice(profile.price, profile.currency)}
              </span>
              <span className={`text-xs font-medium ${profile.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                {profile.change >= 0 ? "+" : ""}{profile.changePercentage.toFixed(2)}%
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Market Cap</span>
                <p className="text-[var(--text-primary)] font-medium">{formatMarketCap(profile.marketCap)}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Sector</span>
                <p className="text-[var(--text-primary)] font-medium">{profile.sector || "—"}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Industry</span>
                <p className="text-[var(--text-primary)] font-medium">{profile.industry || "—"}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">CEO</span>
                <p className="text-[var(--text-primary)] font-medium truncate">{profile.ceo || "—"}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Country</span>
                <p className="text-[var(--text-primary)] font-medium">{profile.country || "—"}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Currency</span>
                <p className="text-[var(--text-primary)] font-medium">{profile.currency || "—"}</p>
              </div>
            </div>

            {/* 52W Range Bar */}
            {profile.range && (() => {
              const [lowStr, highStr] = profile.range.split("-");
              const low = parseFloat(lowStr);
              const high = parseFloat(highStr);
              if (isNaN(low) || isNaN(high) || high <= low) return null;
              const pct = Math.min(100, Math.max(0, ((profile.price - low) / (high - low)) * 100));
              return (
                <div className="text-xs">
                  <span className="text-[var(--text-muted)]">52W Range ({profile.currency || "USD"})</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-10 text-right">{low.toFixed(0)}</span>
                    <div className="flex-1 relative h-1.5 bg-[var(--bg-tertiary)] rounded-full">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[var(--bg-secondary)]"
                        style={{ left: `calc(${pct}% - 5px)` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-10">{high.toFixed(0)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Description */}
            {profile.description && (
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
                {profile.description}
              </p>
            )}

            {/* Website */}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:underline block"
              >
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}

            {/* OpenFIGI data */}
            {figiData && (figiData.figi || figiData.security_type) && (
              <div className="border-t border-[var(--border-color)] pt-2 mt-1">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">OpenFIGI</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  {figiData.figi && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">FIGI</span>
                      <span className="text-[var(--text-primary)] font-mono">{figiData.figi}</span>
                    </div>
                  )}
                  {figiData.security_type && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Type</span>
                      <span className="text-[var(--text-primary)]">{figiData.security_type}</span>
                    </div>
                  )}
                  {figiData.market_sector && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Sector</span>
                      <span className="text-[var(--text-primary)]">{figiData.market_sector}</span>
                    </div>
                  )}
                  {figiData.exch_code && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Exchange</span>
                      <span className="text-[var(--text-primary)]">{figiData.exch_code}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column: chart */}
          {hasChart && (
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <defs>
                      <linearGradient id={`grad-${cacheKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={["auto", "auto"]} hide />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "var(--text-primary)",
                        padding: "4px 8px",
                      }}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload as HistoricalPrice | undefined;
                        return item?.date ?? "";
                      }}
                      formatter={(value) => [formatNativePrice(Number(value), profile.currency), "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={1.5}
                      fill={`url(#grad-${cacheKey})`}
                      dot={false}
                      activeDot={{ r: 3, fill: chartColor }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] text-right">6 months</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No data available</p>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {card}
    </div>
  );
}
