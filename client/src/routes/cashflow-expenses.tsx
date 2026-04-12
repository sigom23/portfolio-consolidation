import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useCashFlowSummary, useTransactions, useReclassifyTransactions } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import {
  MonthSelector,
  UploadButton,
  CategoryBreakdownCard,
  TopMerchantsCard,
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
    limit: 2000,
  });
  const { format } = useCurrency();
  const reclassify = useReclassifyTransactions();
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMerchant, setFilterMerchant] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  // Month counts for the selector
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions ?? []) {
      const key = typeof tx.date === "string" ? tx.date.slice(0, 7) : "";
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [transactions]);

  const filteredTx = useMemo(() => {
    let txs = (transactions ?? []).filter((t) => t.date.startsWith(month));
    if (filterCategory) txs = txs.filter((t) => t.category === filterCategory);
    if (filterMerchant) txs = txs.filter((t) => (t.merchant ?? t.description ?? "").includes(filterMerchant));
    return txs;
  }, [transactions, month, filterCategory, filterMerchant]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Expenses</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Monthly spending by category and source
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reclassify.mutate()}
            disabled={reclassify.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-[2px] text-xs font-medium hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${reclassify.isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {reclassify.isPending ? "Reclassifying..." : reclassify.isSuccess ? `${reclassify.data.updated} updated` : "Reclassify"}
          </button>
          <UploadButton kind="transactions" accept=".pdf,.csv,.png,.jpg,.jpeg,.webp" label="Upload Statement" />
        </div>
      </div>

      {/* 2. Month Selector */}
      <MonthSelector month={month} onMonthChange={setMonth} monthCounts={monthCounts} />

      {/* 3. Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Monthly Expenses
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {summary?.expenseCount ?? 0} transaction
            {summary?.expenseCount === 1 ? "" : "s"}
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

      {/* 4. Source Cards — skipped for expenses (no expense source entities) */}

      {/* 5. Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <CategoryBreakdownCard
          summary={summary}
          loading={summaryLoading}
          selectedCategory={filterCategory}
          onCategoryClick={(cat) => { setFilterCategory(cat); setFilterMerchant(null); }}
        />
        <TopMerchantsCard
          summary={summary}
          loading={summaryLoading}
          selectedMerchant={filterMerchant}
          onMerchantClick={(m) => { setFilterMerchant(m); setFilterCategory(null); }}
        />
      </div>

      {/* 6. Transactions Table */}
      <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Transactions
            {(filterCategory || filterMerchant) && (
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                filtered by {filterCategory ? `"${filterCategory}"` : `"${filterMerchant}"`}
              </span>
            )}
          </h2>
          {(filterCategory || filterMerchant) && (
            <button
              onClick={() => { setFilterCategory(null); setFilterMerchant(null); }}
              className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-mid)] transition-colors"
            >
              Show all
            </button>
          )}
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
