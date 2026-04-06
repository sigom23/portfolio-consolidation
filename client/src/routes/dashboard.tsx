import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { usePortfolioSummary, useHoldings, useRefreshStockPrices } from "../hooks/usePortfolio";
import { useEffect } from "react";
import { PortfolioChart } from "../components/PortfolioChart";
import { BreakdownCards } from "../components/BreakdownCards";
import { HoldingsTable } from "../components/HoldingsTable";

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const refreshPrices = useRefreshStockPrices();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalValue = summary?.totalValue ?? 0;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Welcome back, {user.name ?? user.email}</p>
      </div>

      {/* Total Value Card */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 mb-6 transition-colors">
        <p className="text-sm text-[var(--text-muted)] mb-1">Total Portfolio Value</p>
        {summaryLoading ? (
          <div className="h-9 w-48 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Breakdown Cards */}
      <div className="mb-6">
        <BreakdownCards summary={summary} loading={summaryLoading} />
      </div>

      {/* Chart + Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PortfolioChart summary={summary} loading={summaryLoading} />
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 flex flex-col gap-3 transition-colors">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Quick Actions</h2>
          <a
            href="/upload"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Statement
          </a>
          <a
            href="/wallets"
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Wallet
          </a>
          <button
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${refreshPrices.isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshPrices.isPending ? "Updating..." : "Refresh Prices"}
          </button>
          {refreshPrices.isSuccess && (
            <p className="text-xs text-green-500 text-center">
              Updated {refreshPrices.data.updated} holding(s)
            </p>
          )}
        </div>
      </div>

      {/* Holdings Table */}
      <HoldingsTable holdings={holdings ?? []} loading={holdingsLoading} />
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});
