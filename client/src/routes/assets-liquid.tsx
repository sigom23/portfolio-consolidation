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
import { UploadOnlyModal } from "../components/UploadOnlyModal";
import { RefreshCw, Plus } from "lucide-react";
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
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const },
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
  const [addOpen, setAddOpen] = useState(false);

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
      (h) => h.asset_type !== "crypto" && h.asset_type !== "real_estate" && h.asset_type !== "illiquid"
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
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  const totalValue = summary.totalValue;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      {/* Header with actions */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Liquid Assets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Cash, savings, brokerage, stocks, ETFs, and bonds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--color-faint)] text-[var(--color-mid)] rounded-full text-[14px] font-medium hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshPrices.isPending ? "animate-spin" : ""}`} strokeWidth={1.5} />
            {refreshPrices.isPending ? "Updating..." : "Refresh"}
            {refreshPrices.isSuccess && (
              <span className="text-[var(--color-positive)] text-xs">({refreshPrices.data.updated})</span>
            )}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-charcoal)] text-white rounded-full text-[14px] font-medium hover:bg-[var(--color-dark)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add
          </button>
        </div>
      </div>

      <UploadOnlyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Liquid Assets"
        kind="wealth"
        accept=".pdf,.csv,.png,.jpg,.jpeg,.webp"
        headline="Drop a brokerage statement"
        hint="PDF, CSV, or image — holdings will be extracted automatically"
      />

      {/* Total Value Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            {sourceFilter.type === "all" ? "Liquid Value" : "Filtered Portfolio Value"}
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {summaryLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-[38px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)] tabular-nums">
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

      {!summaryLoading && filteredHoldings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
          className="rounded-[2px] border border-[var(--color-whisper)] bg-white py-24 px-6 text-center"
        >
          <p className="font-serif italic text-[18px] text-[var(--color-mid)]">
            No liquid assets connected yet.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 border border-[var(--color-faint)] text-[var(--color-mid)] rounded-full text-[14px] font-medium hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add your first
          </button>
        </motion.div>
      ) : (
        <>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
          >
            <div className="mb-3 flex items-center justify-end">
              <SourceFilter
                selected={sourceFilter}
                onSelect={setSourceFilter}
                uploads={uploads ?? []}
                wallets={[]}
              />
            </div>
            <HoldingsTable
              holdings={filteredHoldings}
              loading={holdingsLoading}
              uploads={uploads ?? []}
              wallets={[]}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/liquid",
  component: AssetsLiquidPage,
});
