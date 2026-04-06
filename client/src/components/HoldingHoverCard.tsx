import { useState, useEffect, useRef } from "react";
import { fetchCompanyProfile, fetchPriceHistory, type CompanyProfile, type HistoricalPrice } from "../services/api";
import { useCurrency } from "../contexts/CurrencyContext";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis } from "recharts";

interface Props {
  ticker: string;
  exchCode?: string | null;
  children: React.ReactNode;
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

// Client-side caches
const profileCache = new Map<string, CompanyProfile>();
const historyCache = new Map<string, HistoricalPrice[]>();

export function HoldingHoverCard({ ticker, exchCode, children }: Props) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [history, setHistory] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"below" | "above">("below");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const { format } = useCurrency();

  const cacheKey = ticker.toUpperCase();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPosition(rect.bottom + 420 > window.innerHeight ? "above" : "below");
      }

      // Load profile
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

      // Load history
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

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {visible && (
        <div
          className={`absolute z-50 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl p-4 transition-opacity ${
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ left: "0" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div className="space-y-3">
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
                  {format(profile.price)}
                </span>
                <span className={`text-xs font-medium ${profile.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {profile.change >= 0 ? "+" : ""}{profile.changePercentage.toFixed(2)}%
                </span>
              </div>

              {/* Price Chart */}
              {history.length > 0 && (
                <div className="h-20 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id={`gradient-${cacheKey}`} x1="0" y1="0" x2="0" y2="1">
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
                        formatter={(value) => [`${format(Number(value))}`, "Price"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={1.5}
                        fill={`url(#gradient-${cacheKey})`}
                        dot={false}
                        activeDot={{ r: 3, fill: chartColor }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-[var(--text-muted)] text-right mt-0.5">6 months</p>
                </div>
              )}

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
                  <span className="text-[var(--text-muted)]">52W Range</span>
                  <p className="text-[var(--text-primary)] font-medium">{profile.range || "—"}</p>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">IPO Date</span>
                  <p className="text-[var(--text-primary)] font-medium">{profile.ipoDate || "—"}</p>
                </div>
              </div>

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
                  className="text-[10px] text-blue-500 hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}
