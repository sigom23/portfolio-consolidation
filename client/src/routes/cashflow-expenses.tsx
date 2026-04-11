import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useCashFlowSummary, useTransactions } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import {
  CategoryBreakdownCard,
  TransactionsTable,
  currentMonthKey,
} from "../components/cashflow-shared";

function CashFlowExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const { data: summary, isLoading: summaryLoading } = useCashFlowSummary(month);
  const { data: transactions, isLoading: txLoading } = useTransactions({
    sign: "expense",
    limit: 200,
  });
  const { format } = useCurrency();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  const filteredTx = useMemo(() => {
    return (transactions ?? []).filter((t) => t.date.startsWith(month));
  }, [transactions, month]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Expenses</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Monthly spending by category and transaction
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

      {/* Hero: expenses this month */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="hero-card rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Monthly Expenses
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {summary?.transactionCount ?? 0} transaction
            {summary?.transactionCount === 1 ? "" : "s"}
          </span>
        </div>
        {summaryLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-red-500 tabular-nums tracking-tight">
            -<AnimatedNumber value={summary?.expenses ?? 0} format={format} />
          </p>
        )}
      </motion.div>

      {/* Category breakdown */}
      <div className="mb-6">
        <CategoryBreakdownCard summary={summary} loading={summaryLoading} />
      </div>

      {/* Expense transactions table */}
      <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Transactions
          </h2>
        </div>
        <TransactionsTable
          transactions={filteredTx}
          loading={txLoading}
          showAmountSign="expense"
        />
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cashflow/expenses",
  component: CashFlowExpensesPage,
});
