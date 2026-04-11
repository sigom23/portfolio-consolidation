import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings, useProperties, useCashFlowSummary } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AnimatedNumber } from "../components/AnimatedNumber";
import type { Holding } from "../types";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

type CategoryKey = "liquid" | "illiquid" | "real_estate" | "crypto";

type Category = {
  key: CategoryKey;
  label: string;
  to: string;
  value: number;
  color: string;
};

function categoryFor(h: Holding): CategoryKey {
  const t = (h.asset_type ?? "").toLowerCase();
  if (t === "crypto") return "crypto";
  if (t === "real_estate") return "real_estate";
  if (t === "illiquid") return "illiquid";
  return "liquid";
}

function MyWealthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: cashFlow, isLoading: cashFlowLoading } = useCashFlowSummary(currentMonthKey());
  const { format, baseCurrency, flag, rates } = useCurrency();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  // Gross category totals from holdings (USD)
  const grossTotals = useMemo(() => {
    const totals: Record<CategoryKey, number> = {
      liquid: 0,
      illiquid: 0,
      real_estate: 0,
      crypto: 0,
    };
    for (const h of holdings ?? []) {
      totals[categoryFor(h)] += h.value_usd ?? 0;
    }
    return totals;
  }, [holdings]);

  // Liabilities (sum of active property mortgage balances, converted to USD).
  // In v1, all liabilities are real-estate mortgages — so they reduce the
  // real estate category directly, not net worth separately.
  const totalMortgageUsd = useMemo(() => {
    if (!properties) return 0;
    let total = 0;
    for (const p of properties) {
      const ccy = p.currency.toUpperCase();
      const balance = p.total_mortgage_balance;
      if (ccy === "USD") total += balance;
      else if (rates[ccy]) total += balance / rates[ccy];
      else total += balance;
    }
    return total;
  }, [properties, rates]);

  // Real estate shown as net equity (property value - mortgages). Clamped to 0
  // to avoid showing underwater properties as negative wealth in v1 — the full
  // picture is still visible on /assets/real-estate.
  const realEstateNet = Math.max(grossTotals.real_estate - totalMortgageUsd, 0);

  const categoryTotals: Record<CategoryKey, number> = {
    liquid: grossTotals.liquid,
    illiquid: grossTotals.illiquid,
    real_estate: realEstateNet,
    crypto: grossTotals.crypto,
  };

  const netWorth =
    categoryTotals.liquid +
    categoryTotals.illiquid +
    categoryTotals.real_estate +
    categoryTotals.crypto;
  const loading = holdingsLoading || propertiesLoading;

  const categories: Category[] = [
    { key: "liquid", label: "Liquid", to: "/assets/liquid", value: categoryTotals.liquid, color: "#3b82f6" },
    { key: "illiquid", label: "Illiquid", to: "/assets/illiquid", value: categoryTotals.illiquid, color: "#8b5cf6" },
    { key: "real_estate", label: "Real Estate", to: "/assets/real-estate", value: categoryTotals.real_estate, color: "#06b6d4" },
    { key: "crypto", label: "Crypto", to: "/assets/crypto", value: categoryTotals.crypto, color: "#f59e0b" },
  ];

  const donutData = categories
    .map((c) => ({ name: c.label, value: c.value, color: c.color }))
    .filter((d) => d.value > 0);

  // Top 5 liquid holdings (excludes real_estate and crypto — those have their own surfaces)
  const topHoldings = useMemo(() => {
    return (holdings ?? [])
      .filter((h) => h.asset_type !== "real_estate" && h.asset_type !== "crypto")
      .slice()
      .sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0))
      .slice(0, 5);
  }, [holdings]);

  // Most recent update across all holdings
  const lastUpdated = useMemo(() => {
    if (!holdings || holdings.length === 0) return null;
    let latest = "";
    for (const h of holdings) {
      if (h.last_updated && h.last_updated > latest) latest = h.last_updated;
    }
    return latest || null;
  }, [holdings]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Wealth</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          A consolidated view of your wealth
        </p>
      </div>

      {/* Net Worth hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="hero-card rounded-2xl p-8 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Net Worth
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {loading ? (
          <div className="h-12 w-64 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-5xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={netWorth} format={format} />
          </p>
        )}
        {!loading && totalMortgageUsd > 0 && (
          <div className="flex items-center gap-5 mt-3 text-[11px] text-[var(--text-muted)]">
            <span>
              Assets{" "}
              <span className="font-medium text-[var(--text-secondary)] tabular-nums">
                {format(netWorth + totalMortgageUsd)}
              </span>
            </span>
            <span>
              Liabilities{" "}
              <span className="font-medium text-red-500 tabular-nums">
                -{format(totalMortgageUsd)}
              </span>
            </span>
          </div>
        )}
        {lastUpdated && !loading && (
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Last updated{" "}
            {new Date(lastUpdated).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </motion.div>

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {categories.map((cat, i) => {
          const pct = netWorth > 0 ? (cat.value / netWorth) * 100 : 0;
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            >
              <Link
                to={cat.to}
                className="block rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {cat.label}
                  </p>
                </div>
                {loading ? (
                  <div className="mt-2 h-7 w-28 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                ) : (
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)] tabular-nums tracking-tight">
                    {format(cat.value)}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--text-muted)] tabular-nums">
                  {loading ? "—" : `${pct.toFixed(1)}% of net worth`}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly Cash Flow strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="mb-4"
      >
        <Link
          to="/cashflow"
          className="block rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 hover:border-blue-500/40 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Cash Flow
                </p>
                <span className="text-xs text-[var(--text-muted)]">{currentMonthLabel()}</span>
              </div>
              {cashFlowLoading ? (
                <div className="mt-2 h-8 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
              ) : (
                <p
                  className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
                    (cashFlow?.net ?? 0) >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {(cashFlow?.net ?? 0) >= 0 ? "+" : "-"}
                  {format(Math.abs(cashFlow?.net ?? 0))}
                </p>
              )}
              {!cashFlowLoading && cashFlow && (
                <div className="mt-1 flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
                  <span>
                    Income{" "}
                    <span className="font-medium text-[var(--text-secondary)] tabular-nums">
                      +{format(cashFlow.income)}
                    </span>
                  </span>
                  <span>
                    Expenses{" "}
                    <span className="font-medium text-[var(--text-secondary)] tabular-nums">
                      -{format(cashFlow.expenses)}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              {!cashFlowLoading && cashFlow && (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    Savings rate
                  </p>
                  <p
                    className={`text-xl font-semibold tabular-nums ${
                      cashFlow.savingsRate >= 0.2
                        ? "text-green-500"
                        : cashFlow.savingsRate >= 0
                          ? "text-yellow-500"
                          : "text-red-500"
                    }`}
                  >
                    {(cashFlow.savingsRate * 100).toFixed(0)}%
                  </p>
                </>
              )}
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Composition donut + Top 5 Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Wealth Composition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
        >
          <h2 className="text-sm font-medium text-[var(--text-muted)] mb-4">Wealth Composition</h2>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : donutData.length === 0 ? (
            <div className="flex items-center justify-center h-48 rounded-lg bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
              <p className="text-[var(--text-muted)] text-sm">No wealth to display yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              {/* Donut */}
              <div className="relative w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)]">Net Worth</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {format(netWorth)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {donutData.map((entry) => {
                  const pct = netWorth > 0 ? (entry.value / netWorth) * 100 : 0;
                  return (
                    <div key={entry.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{entry.name}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
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
        </motion.div>

        {/* Top 5 Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col"
        >
          <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-color)]">
            <h2 className="text-sm font-medium text-[var(--text-muted)]">Top Holdings</h2>
            <Link
              to="/assets/liquid"
              className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : topHoldings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-[var(--text-muted)]">No holdings yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]/50 flex-1">
              {topHoldings.map((h) => {
                const pct = netWorth > 0 ? ((h.value_usd ?? 0) / netWorth) * 100 : 0;
                return (
                  <div
                    key={h.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{h.name}</p>
                      {h.ticker && (
                        <p className="text-[11px] text-[var(--text-muted)] uppercase">{h.ticker}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {format(h.value_usd ?? 0)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-wealth",
  component: MyWealthPage,
});
