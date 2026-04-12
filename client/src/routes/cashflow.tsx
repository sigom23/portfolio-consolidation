import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useCashFlowSummary, useTransactions } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import {
  MonthSelector,
  CategoryBreakdownCard,
  TopMerchantsCard,
  MonthlyTrendCard,
  currentMonthKey,
} from "../components/cashflow-shared";

function CashFlowOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const { data: summary, isLoading } = useCashFlowSummary(month);
  const { data: allTx, isLoading: txLoading } = useTransactions({ limit: 2000 });
  const { format } = useCurrency();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  // Month counts from all transactions
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of allTx ?? []) {
      const key = typeof tx.date === "string" ? tx.date.slice(0, 7) : "";
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [allTx]);

  // Split transactions by sign for trend cards
  const incomeTx = useMemo(() => (allTx ?? []).filter((t) => t.amount > 0), [allTx]);
  const expenseTx = useMemo(() => (allTx ?? []).filter((t) => t.amount < 0), [allTx]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  const income = summary?.income ?? 0;
  const expenses = summary?.expenses ?? 0;
  const net = summary?.net ?? 0;
  const savingsRate = summary?.savingsRate ?? 0;
  const netColor = net >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Cash Flow</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Income, expenses, and monthly net
          </p>
        </div>
      </div>

      {/* 2. Month Selector */}
      <MonthSelector month={month} onMonthChange={setMonth} monthCounts={monthCounts} />

      {/* 3. Hero: Net cash flow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Net Cash Flow
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {summary?.transactionCount ?? 0} transaction
            {(summary?.transactionCount ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
        {isLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className={`text-[38px] font-serif font-light tracking-[-0.03em] tabular-nums tracking-tight ${netColor}`}>
            {net >= 0 ? "+" : ""}
            <AnimatedNumber value={Math.abs(net)} format={(v) => format(v)} />
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Savings rate:{" "}
          <span
            className={`font-medium ${
              savingsRate >= 0.2
                ? "text-[var(--color-positive)]"
                : savingsRate >= 0
                  ? "text-[var(--color-pending)]"
                  : "text-[var(--color-negative)]"
            }`}
          >
            {(savingsRate * 100).toFixed(1)}%
          </span>
        </p>
      </motion.div>

      {/* 4. Income vs Expenses summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
        >
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            Income
          </p>
          <p className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--color-positive)] tabular-nums tracking-tight">
            +{format(income)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
        >
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            Expenses
          </p>
          <p className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--color-negative)] tabular-nums tracking-tight">
            -{format(expenses)}
          </p>
        </motion.div>
      </div>

      {/* 5. Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CategoryBreakdownCard summary={summary} loading={isLoading} />
        <TopMerchantsCard summary={summary} loading={isLoading} />
      </div>

      {/* 6. Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyTrendCard transactions={incomeTx} sign="income" loading={txLoading} />
        <MonthlyTrendCard transactions={expenseTx} sign="expense" loading={txLoading} />
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cashflow",
  component: CashFlowOverviewPage,
});
