import { motion } from "motion/react";
import { useCurrency } from "../contexts/CurrencyContext";
import type {
  CashFlowSummary,
  IncomeStreamType,
  Transaction,
} from "../types";

// ============================================================
// Shared constants — consumed across Overview / Income / Expenses routes
// ============================================================

export const TYPE_COLORS: Record<IncomeStreamType, string> = {
  salary: "#3b82f6",
  dividend: "#8b5cf6",
  freelance: "#f59e0b",
  pension: "#14b8a6",
  interest: "#22c55e",
  rental: "#06b6d4",
  other: "#64748b",
};

export const TYPE_LABELS: Record<IncomeStreamType, string> = {
  salary: "Salary",
  dividend: "Dividend",
  freelance: "Freelance",
  pension: "Pension",
  interest: "Interest",
  rental: "Rental",
  other: "Other",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Housing: "#3b82f6",
  Groceries: "#10b981",
  Transport: "#6366f1",
  "Food & Drink": "#f97316",
  Shopping: "#ec4899",
  Entertainment: "#8b5cf6",
  Health: "#ef4444",
  Travel: "#14b8a6",
  Subscriptions: "#a78bfa",
  Bills: "#f59e0b",
  Boat: "#06b6d4",
  Income: "#22c55e",
  Transfers: "#64748b",
  Other: "#94a3b8",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  CHF: "Fr",
  JPY: "\u00a5",
  CAD: "C$",
  AUD: "A$",
};

// ============================================================
// Shared helpers
// ============================================================

export function getCategoryColor(cat: string, i: number): string {
  return (
    CATEGORY_COLORS[cat] ??
    ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6366f1"][i % 6]
  );
}

/** Monthly equivalent of an income stream in its native currency. */
export function monthlyEquivalent(stream: {
  frequency: string;
  amount: number;
}): number {
  if (stream.frequency === "monthly") return stream.amount;
  if (stream.frequency === "quarterly") return stream.amount / 3;
  if (stream.frequency === "yearly") return stream.amount / 12;
  return 0;
}

/** Convert a native-currency amount to USD using live FX rates. */
export function toUsd(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  const rate = rates[ccy];
  if (!rate) return amount;
  return amount / rate;
}

export function formatLocal(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + " ";
  if (currency === "JPY")
    return `${sym}${Math.round(value).toLocaleString()}`;
  return `${sym}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ============================================================
// Shared components
// ============================================================

/** Category breakdown used by Overview and Expenses. */
export function CategoryBreakdownCard({
  summary,
  loading,
}: {
  summary: CashFlowSummary | undefined;
  loading: boolean;
}) {
  const { format } = useCurrency();
  const categories = summary?.categories ?? [];
  const total = summary?.expenses ?? 0;

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">
        Expenses by Category
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse"
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">
          No expenses this period.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.slice(0, 8).map((cat, i) => {
            const pct = total > 0 ? (cat.value / total) * 100 : 0;
            const color = getCategoryColor(cat.name, i);
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
                      {format(cat.value)}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Top merchants list — Overview only. Kept in shared since it's conceptually peer to CategoryBreakdownCard. */
export function TopMerchantsCard({
  summary,
  loading,
}: {
  summary: CashFlowSummary | undefined;
  loading: boolean;
}) {
  const { format } = useCurrency();
  const merchants = summary?.topMerchants ?? [];

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">
        Top Merchants
      </h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse"
            />
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">
          No merchants this period.
        </p>
      ) : (
        <ul className="space-y-2">
          {merchants.slice(0, 8).map((m, i) => (
            <li
              key={m.name}
              className="flex items-center justify-between py-1.5 border-b border-[var(--border-color)]/50 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums w-4">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {m.name}
                </span>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                {format(m.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shared transactions table — used by Income and Expenses. */
export function TransactionsTable({
  transactions,
  loading,
  showAmountSign,
}: {
  transactions: Transaction[];
  loading: boolean;
  showAmountSign: "income" | "expense";
}) {
  const { format, rates } = useCurrency();

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-[var(--bg-tertiary)] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-[var(--text-muted)]">
        {showAmountSign === "income"
          ? "No income transactions yet. Add a stream or upload a statement."
          : "No expense transactions yet. Upload a credit card or bank statement."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-color)]">
            <th className="px-6 py-3 font-medium">Date</th>
            <th className="px-6 py-3 font-medium">Description</th>
            <th className="px-6 py-3 font-medium">Category</th>
            <th className="px-6 py-3 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const amountUsd =
              tx.amount_usd ?? toUsd(tx.amount, tx.currency, rates);
            const isIncome = tx.amount > 0;
            const sign = isIncome ? "+" : "-";
            const colorClass = isIncome ? "text-green-500" : "text-red-500";
            return (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + Math.min(i, 30) * 0.02 }}
                className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
              >
                <td className="px-6 py-3 text-sm text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)] max-w-xs">
                  <div className="truncate">{tx.description ?? "—"}</div>
                  {tx.merchant && tx.merchant !== tx.description && (
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      {tx.merchant}
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {tx.category ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${
                          CATEGORY_COLORS[tx.category] ?? "#94a3b8"
                        }1a`,
                        color: CATEGORY_COLORS[tx.category] ?? "#94a3b8",
                      }}
                    >
                      {tx.category}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-right tabular-nums">
                  <div>
                    <span className={`font-medium ${colorClass}`}>
                      {sign}
                      {formatLocal(Math.abs(tx.amount), tx.currency)}
                    </span>
                    {tx.currency.toUpperCase() !== "USD" && (
                      <span className="block text-[11px] text-[var(--text-muted)]">
                        {sign}
                        {format(Math.abs(amountUsd))}
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
