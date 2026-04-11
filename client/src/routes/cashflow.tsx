import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useCashFlowSummary } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import {
  CategoryBreakdownCard,
  TopMerchantsCard,
  currentMonthKey,
} from "../components/cashflow-shared";

function CashFlowOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const { data: summary, isLoading } = useCashFlowSummary(month);
  const { format } = useCurrency();

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

  const income = summary?.income ?? 0;
  const expenses = summary?.expenses ?? 0;
  const net = summary?.net ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const netColor = net >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cash Flow</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Monthly net cash flow — income minus expenses
          </p>
        </div>
      </div>

      {/* Month picker */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Month
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Hero: Net cash flow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="hero-card rounded-2xl p-6 mb-6"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Net Cash Flow
        </p>
        {isLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className={`text-4xl font-bold tabular-nums tracking-tight ${netColor}`}>
            {net >= 0 ? "+" : ""}
            <AnimatedNumber value={Math.abs(net)} format={(v) => format(v)} />
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Savings rate:{" "}
          <span
            className={`font-medium ${
              savingsRate >= 0.2
                ? "text-green-500"
                : savingsRate >= 0
                  ? "text-yellow-500"
                  : "text-red-500"
            }`}
          >
            {(savingsRate * 100).toFixed(1)}%
          </span>
        </p>
      </motion.div>

      {/* Income vs Expenses cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Income
          </p>
          <p className="text-2xl font-bold text-green-500 tabular-nums tracking-tight">
            +{format(income)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Expenses
          </p>
          <p className="text-2xl font-bold text-red-500 tabular-nums tracking-tight">
            -{format(expenses)}
          </p>
        </motion.div>
      </div>

      {/* Category breakdown + Top merchants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryBreakdownCard summary={summary} loading={isLoading} />
        <TopMerchantsCard summary={summary} loading={isLoading} />
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cashflow",
  component: CashFlowOverviewPage,
});
