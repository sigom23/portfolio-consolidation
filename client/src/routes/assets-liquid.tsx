import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings, useUploads, useRefreshStockPrices, useSectorAllocation, useGeographyAllocation } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { PortfolioChart } from "../components/PortfolioChart";
import { BreakdownCards } from "../components/BreakdownCards";
import { HoldingsTable } from "../components/HoldingsTable";
import { SectorChart } from "../components/SectorChart";
import { CurrencyChart } from "../components/CurrencyChart";
import { GeographyChart } from "../components/GeographyChart";
import { SourceFilter, type SourceSelection } from "../components/SourceFilter";
import { AnimatedNumber } from "../components/AnimatedNumber";
import type { Holding, PortfolioSummary } from "../types";

function computeSummary(holdings: Holding[]): PortfolioSummary {
  const breakdown = { stocks: 0, crypto: 0, bonds: 0, cash: 0, real_estate: 0, other: 0 };
  let totalValue = 0;

  for (const h of holdings) {
    const val = h.value_usd ?? 0;
    totalValue += val;
    const type = (h.asset_type ?? "other").toLowerCase();
    if (type in breakdown) {
      breakdown[type as keyof typeof breakdown] += val;
    } else {
      breakdown.other += val;
    }
  }

  return {
    totalValue,
    breakdown,
  };
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function AssetsLiquidPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: uploads } = useUploads();
  const refreshPrices = useRefreshStockPrices();
  const { data: sectorData, isLoading: sectorLoading } = useSectorAllocation();
  const { data: geographyData, isLoading: geographyLoading } = useGeographyAllocation();
  const { format, baseCurrency, flag } = useCurrency();
  const [sourceFilter, setSourceFilter] = useState<SourceSelection>({ type: "all" });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  // Liquid view excludes crypto (lives under /assets/crypto) and real estate
  // (lives under /assets/real-estate). Both are synced into `holdings` from
  // their own detail tables.
  const liquidHoldings = useMemo(() => {
    if (!holdings) return [];
    return holdings.filter(
      (h) => h.asset_type !== "crypto" && h.asset_type !== "real_estate"
    );
  }, [holdings]);

  // Filter holdings by selected source
  const filteredHoldings = useMemo(() => {
    if (sourceFilter.type === "all") return liquidHoldings;
    return liquidHoldings.filter(
      (h) => h.source_type === sourceFilter.type && h.source_id === sourceFilter.id
    );
  }, [liquidHoldings, sourceFilter]);

  // Compute summary from filtered holdings. Mortgages live on /assets/real-estate
  // and on /my-wealth — they are not part of the liquid total.
  const summary = useMemo(() => computeSummary(filteredHoldings), [filteredHoldings]);
  const summaryLoading = holdingsLoading;

  // Most recent update across all holdings
  const lastUpdated = useMemo(() => {
    if (!filteredHoldings.length) return null;
    let latest = "";
    for (const h of filteredHoldings) {
      if (h.last_updated && h.last_updated > latest) latest = h.last_updated;
    }
    return latest || null;
  }, [filteredHoldings]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalValue = summary.totalValue;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header with actions */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Liquid Assets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Cash, savings, brokerage, stocks, ETFs, and bonds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${refreshPrices.isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshPrices.isPending ? "Updating..." : "Refresh"}
            {refreshPrices.isSuccess && (
              <span className="text-green-500 text-xs">({refreshPrices.data.updated})</span>
            )}
          </button>
          <a
            href="/data-room"
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </a>
          <SourceFilter
            selected={sourceFilter}
            onSelect={setSourceFilter}
            uploads={uploads ?? []}
            wallets={[]}
          />
        </div>
      </div>

      {/* Total Value Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="hero-card rounded-2xl p-6 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            {sourceFilter.type === "all" ? "Total Liquid Value" : "Filtered Portfolio Value"}
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {summaryLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totalValue} format={format} />
          </p>
        )}
        {lastUpdated && !summaryLoading && (
          <p className="text-[11px] text-[var(--text-muted)] mt-2">
            Last updated {new Date(lastUpdated).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}{" "}
            at {new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {sourceFilter.type === "upload" && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Showing {filteredHoldings.length} holding(s) from{" "}
            {(uploads ?? []).find((u) => String(u.id) === sourceFilter.id)?.filename ?? `Upload #${sourceFilter.id}`}
          </p>
        )}
      </motion.div>

      {/* Breakdown Cards */}
      <div className="mb-6">
        <BreakdownCards summary={summary} loading={summaryLoading} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {[
          <PortfolioChart key="portfolio" summary={summary} loading={summaryLoading} />,
          <CurrencyChart key="currency" holdings={filteredHoldings} loading={holdingsLoading} />,
          <GeographyChart key="geography" regions={geographyData ?? []} loading={geographyLoading} />,
          <SectorChart key="sector" sectors={sectorData ?? []} loading={sectorLoading} />,
        ].map((chart, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            {chart}
          </motion.div>
        ))}
      </div>

      {/* Holdings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      >
        <HoldingsTable
          holdings={filteredHoldings}
          loading={holdingsLoading}
          uploads={uploads ?? []}
          wallets={[]}
        />
      </motion.div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/liquid",
  component: AssetsLiquidPage,
});
