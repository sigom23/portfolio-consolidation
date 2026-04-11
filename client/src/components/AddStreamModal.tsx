import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCreateIncomeStream } from "../hooks/usePortfolio";
import type { IncomeStreamType, IncomeFrequency, NewIncomeStream } from "../types";

const TYPES: { value: IncomeStreamType; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "dividend", label: "Dividend" },
  { value: "freelance", label: "Freelance" },
  { value: "pension", label: "Pension" },
  { value: "interest", label: "Interest" },
  { value: "other", label: "Other" },
];

const FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "irregular", label: "Irregular" },
];

const CURRENCIES = ["USD", "EUR", "CHF", "GBP", "JPY", "CAD", "AUD"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddStreamModal({ open, onClose }: Props) {
  const create = useCreateIncomeStream();

  const [name, setName] = useState("");
  const [type, setType] = useState<IncomeStreamType>("salary");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("25");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [notes, setNotes] = useState("");

  function reset() {
    setName("");
    setType("salary");
    setAmount("");
    setCurrency("USD");
    setFrequency("monthly");
    setDayOfMonth("25");
    setNotes("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;

    const stream: NewIncomeStream = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      currency,
      frequency,
      day_of_month: frequency === "monthly" || frequency === "quarterly" ? parseInt(dayOfMonth, 10) : null,
      start_date: startDate,
      is_active: true,
      notes: notes.trim() || null,
    };

    try {
      await create.mutateAsync(stream);
      reset();
      onClose();
    } catch {
      // error surfaced below
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="hero-card rounded-2xl w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Income Stream</h2>
                <button
                  onClick={onClose}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Day Job"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IncomeStreamType)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Net Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5000"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {(frequency === "monthly" || frequency === "quarterly") && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Day of month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {create.isError && (
                  <p className="text-xs text-red-500">{create.error.message}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={create.isPending}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {create.isPending ? "Adding..." : "Add Stream"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
