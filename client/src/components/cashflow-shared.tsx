import { useRef } from "react";
import { motion } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "../contexts/CurrencyContext";
import { useUploadStatement } from "../hooks/usePortfolio";
import type {
  CashFlowSummary,
  IncomeStream,
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

/** Generate last N months as YYYY-MM strings, most recent first. */
export function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return months;
}

/** Format YYYY-MM to short label like "Sep 25". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** 12-month pill selector with data indicators. */
export function MonthSelector({
  month,
  onMonthChange,
  monthCounts,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  monthCounts: Record<string, number>;
}) {
  const months = lastNMonths(12);
  return (
    <div className="mb-5">
      <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
        Month
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {months.map((m) => {
          const isActive = m === month;
          const count = monthCounts[m] ?? 0;
          const hasData = count > 0;
          return (
            <button
              key={m}
              onClick={() => onMonthChange(m)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : hasData
                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-blue-500/50"
                    : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              {monthLabel(m)}
              {hasData && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Compact upload button for page headers. */
export function UploadButton({
  kind,
  accept,
  label,
}: {
  kind: "salary" | "transactions";
  accept: string;
  label: string;
}) {
  const mutation = useUploadStatement();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            mutation.mutate(
              { file: f, kind },
              { onSuccess: () => { if (fileRef.current) fileRef.current.value = ""; } }
            );
          }
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={mutation.isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {mutation.isPending ? "Parsing..." : label}
      </button>
      {mutation.isError && (
        <span className="text-xs text-red-500">{mutation.error.message}</span>
      )}
      {mutation.isSuccess && (
        <span className="text-xs text-green-500">
          {mutation.data?.kind === "salary"
            ? (mutation.data as any).updated ? "Stream updated" : "Stream created"
            : `${mutation.data?.inserted ?? 0} inserted`}
        </span>
      )}
    </div>
  );
}

/** Income by type donut chart. */
export function IncomeByTypeCard({
  streams,
  loading,
}: {
  streams: IncomeStream[];
  loading: boolean;
}) {
  const { format } = useCurrency();

  if (loading) {
    return (
      <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group active streams by type
  const byType: Record<string, number> = {};
  for (const s of streams) {
    if (!s.is_active) continue;
    const monthly = monthlyEquivalent(s);
    byType[s.type] = (byType[s.type] ?? 0) + monthly;
  }

  const data = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      name: TYPE_LABELS[type as IncomeStreamType] ?? type,
      value,
      color: TYPE_COLORS[type as IncomeStreamType] ?? "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full">
      <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">
        Income by Type
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">
          No active income streams.
        </p>
      ) : (
        <div className="flex items-start gap-6">
          <div className="relative w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-[10px] text-[var(--text-muted)]">Monthly</p>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  {format(total)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.map((entry) => {
              const pct = total > 0 ? (entry.value / total) * 100 : 0;
              return (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1">
                    {entry.name}
                  </span>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] tabular-nums flex-shrink-0">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 6-month trend bar chart for income or expenses. */
export function MonthlyTrendCard({
  transactions,
  sign,
  loading,
}: {
  transactions: Transaction[];
  sign: "income" | "expense";
  loading: boolean;
}) {
  const { format } = useCurrency();
  const isIncome = sign === "income";

  if (loading) {
    return (
      <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group transactions by month, last 6 months
  const months = lastNMonths(6).reverse();
  const byMonth: Record<string, number> = {};
  for (const tx of transactions) {
    const key = typeof tx.date === "string" ? tx.date.slice(0, 7) : "";
    if (!key) continue;
    const amt = tx.amount_usd ?? tx.amount;
    byMonth[key] = (byMonth[key] ?? 0) + Math.abs(amt);
  }

  const data = months.map((m) => ({
    month: monthLabel(m),
    value: byMonth[m] ?? 0,
  }));

  const barColor = isIncome ? "#22c55e" : "#ef4444";

  return (
    <div className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full">
      <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">
        {isIncome ? "Income Trend" : "Expense Trend"}
      </h3>
      {data.every((d) => d.value === 0) ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">
          No data yet.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--bg-tertiary)" }}
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [format(Number(value)), isIncome ? "Income" : "Expenses"]}
            />
            <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

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
