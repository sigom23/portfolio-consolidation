import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import {
  useIncomeStreams,
  useTransactions,
  useDeleteIncomeStream,
  useCashFlowSummary,
} from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { AddStreamModal } from "../components/AddStreamModal";
import {
  MonthSelector,
  UploadButton,
  IncomeByTypeCard,
  MonthlyTrendCard,
  TransactionsTable,
  TYPE_COLORS,
  TYPE_LABELS,
  monthlyEquivalent,
  toUsd,
  formatLocal,
  currentMonthKey,
} from "../components/cashflow-shared";
import type { IncomeStream } from "../types";

function CashFlowIncomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthKey());
  const { data: streams, isLoading: streamsLoading } = useIncomeStreams();
  const { data: summary, isLoading: summaryLoading } = useCashFlowSummary(month);
  const { data: transactions, isLoading: txLoading } = useTransactions({
    sign: "income",
    limit: 2000,
  });
  const deleteStream = useDeleteIncomeStream();
  const { format, rates } = useCurrency();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<IncomeStream | null>(null);

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

  // Transactions filtered by month
  const filteredTx = useMemo(() => {
    return (transactions ?? []).filter((t) => t.date.startsWith(month));
  }, [transactions, month]);

  const sortedStreams = useMemo(() => {
    return [...(streams ?? [])].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (
        toUsd(monthlyEquivalent(b), b.currency, rates) -
        toUsd(monthlyEquivalent(a), a.currency, rates)
      );
    });
  }, [streams, rates]);

  function openEdit(stream: IncomeStream) {
    setEditingStream(stream);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingStream(null);
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* 1. Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Income</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Recurring streams and monthly activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UploadButton kind="salary" accept=".pdf,.png,.jpg,.jpeg,.webp" label="Upload Salary" />
          <button
            onClick={() => { setEditingStream(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Stream
          </button>
        </div>
      </div>

      {/* 2. Month Selector */}
      <MonthSelector month={month} onMonthChange={setMonth} monthCounts={monthCounts} />

      {/* 3. Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="hero-card rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Monthly Income
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {summary?.incomeCount ?? 0} transaction{(summary?.incomeCount ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
        {summaryLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-green-500 tabular-nums tracking-tight">
            +<AnimatedNumber value={summary?.income ?? 0} format={format} />
          </p>
        )}
      </motion.div>

      {/* 4. Source Cards — Income Streams */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Income Streams
          </h2>
        </div>
        {streamsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 h-32 animate-pulse"
              />
            ))}
          </div>
        ) : sortedStreams.length === 0 ? (
          <div className="card-elevated rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-10 text-center">
            <p className="text-[var(--text-muted)] text-sm mb-3">
              No income streams yet.
            </p>
            <button
              onClick={() => { setEditingStream(null); setModalOpen(true); }}
              className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
            >
              Add your first stream →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedStreams.map((stream, i) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                index={i}
                onEdit={() => openEdit(stream)}
                onDelete={() => {
                  if (confirm(`Delete "${stream.name}"? This will remove all its generated transactions.`)) {
                    deleteStream.mutate(stream.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <IncomeByTypeCard streams={streams ?? []} loading={streamsLoading} />
        <MonthlyTrendCard transactions={transactions ?? []} sign="income" loading={txLoading} />
      </div>

      {/* 6. Transactions Table */}
      <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Transactions
          </h2>
        </div>
        <TransactionsTable
          transactions={filteredTx}
          loading={txLoading}
          showAmountSign="income"
        />
      </div>

      <AddStreamModal open={modalOpen} onClose={closeModal} stream={editingStream} />
    </div>
  );
}

function StreamCard({
  stream,
  index,
  onEdit,
  onDelete,
}: {
  stream: IncomeStream;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { format, rates } = useCurrency();
  const color = TYPE_COLORS[stream.type];
  const monthly = monthlyEquivalent(stream);
  const monthlyUsd = toUsd(monthly, stream.currency, rates);

  const cadenceLabel =
    stream.frequency === "monthly"
      ? `Every month${stream.day_of_month ? ` on day ${stream.day_of_month}` : ""}`
      : stream.frequency === "quarterly"
        ? `Every quarter${stream.day_of_month ? ` on day ${stream.day_of_month}` : ""}`
        : stream.frequency === "yearly"
          ? "Once a year"
          : "Irregular";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={`card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 transition-colors cursor-pointer ${
        !stream.is_active ? "opacity-60" : ""
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {TYPE_LABELS[stream.type]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-[var(--text-muted)] hover:text-blue-500 transition-colors"
            title="Edit stream"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
            title="Delete stream"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        {stream.name}
      </h3>
      <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
        {formatLocal(stream.amount, stream.currency)}
      </p>
      <p className="text-[11px] text-[var(--text-muted)] mt-1">{cadenceLabel}</p>
      {monthly > 0 && stream.currency.toUpperCase() !== "USD" && (
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          ≈ {format(monthlyUsd)}/month
        </p>
      )}
    </motion.div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cashflow/income",
  component: CashFlowIncomePage,
});
