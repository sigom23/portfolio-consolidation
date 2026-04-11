import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import {
  useIncomeStreams,
  useTransactions,
  useDeleteIncomeStream,
} from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { AddStreamModal } from "../components/AddStreamModal";
import {
  TransactionsTable,
  TYPE_COLORS,
  TYPE_LABELS,
  monthlyEquivalent,
  toUsd,
  formatLocal,
} from "../components/cashflow-shared";
import type { IncomeStream } from "../types";

function CashFlowIncomePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: streams, isLoading: streamsLoading } = useIncomeStreams();
  const { data: transactions, isLoading: txLoading } = useTransactions({
    sign: "income",
    limit: 30,
  });
  const deleteStream = useDeleteIncomeStream();
  const { format, rates } = useCurrency();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  const totals = useMemo(() => {
    if (!streams) return { monthly: 0, annual: 0, activeCount: 0 };
    let monthlyUsd = 0;
    let activeCount = 0;
    for (const s of streams) {
      if (!s.is_active) continue;
      activeCount++;
      const monthlyInCcy = monthlyEquivalent(s);
      monthlyUsd += toUsd(monthlyInCcy, s.currency, rates);
    }
    return { monthly: monthlyUsd, annual: monthlyUsd * 12, activeCount };
  }, [streams, rates]);

  const sortedStreams = useMemo(() => {
    return [...(streams ?? [])].sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return (
        toUsd(monthlyEquivalent(b), b.currency, rates) -
        toUsd(monthlyEquivalent(a), a.currency, rates)
      );
    });
  }, [streams, rates]);

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
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Income</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Recurring streams and recent transactions
          </p>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="hero-card rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Monthly Income (est.)
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {totals.activeCount} active stream{totals.activeCount === 1 ? "" : "s"}
          </span>
        </div>
        {streamsLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totals.monthly} format={format} />
          </p>
        )}
        {!streamsLoading && totals.activeCount > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Annualized:{" "}
            <span className="font-medium text-[var(--text-secondary)]">
              {format(totals.annual)}
            </span>
          </p>
        )}
      </motion.div>

      {/* Streams grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Income Streams
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Stream
          </button>
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
              onClick={() => setModalOpen(true)}
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
                onDelete={() => {
                  if (
                    confirm(
                      `Delete "${stream.name}"? This will remove all its generated transactions.`
                    )
                  ) {
                    deleteStream.mutate(stream.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent income */}
      <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recent Income
          </h2>
        </div>
        <TransactionsTable
          transactions={transactions ?? []}
          loading={txLoading}
          showAmountSign="income"
        />
      </div>

      <AddStreamModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function StreamCard({
  stream,
  index,
  onDelete,
}: {
  stream: IncomeStream;
  index: number;
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
      className={`card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 transition-colors ${
        !stream.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {TYPE_LABELS[stream.type]}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
          title="Delete stream"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
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
