import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { usePortfolioSummary, useHoldings } from "../hooks/usePortfolio";
import { useEffect } from "react";
import { PortfolioChart } from "../components/PortfolioChart";
import { HoldingsTable } from "../components/HoldingsTable";

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const totalValue = summary?.totalValue ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user.name ?? user.email}</p>
      </div>

      {/* Portfolio Value */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <p className="text-sm text-gray-500 mb-1">Total Portfolio Value</p>
        <p className="text-3xl font-bold text-gray-900">
          {summaryLoading ? (
            <span className="text-gray-400">Loading...</span>
          ) : (
            `$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </p>
      </div>

      {/* Chart + Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PortfolioChart />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
          <a
            href="/upload"
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Statement
          </a>
          <a
            href="/wallets"
            className="block text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Add Wallet
          </a>
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
