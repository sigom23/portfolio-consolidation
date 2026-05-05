import { useState, useEffect, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCreateIncomeStream, useUpdateIncomeStream } from "../hooks/usePortfolio";
import { X } from "lucide-react";
import { UploadDropzone } from "./UploadDropzone";
import type { IncomeStream, IncomeStreamType, IncomeFrequency, NewIncomeStream } from "../types";

const TYPES: { value: IncomeStreamType; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "dividend", label: "Dividend" },
  { value: "freelance", label: "Freelance" },
  { value: "pension", label: "Pension" },
  { value: "interest", label: "Interest" },
  { value: "rental", label: "Rental" },
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
  /** Pass an existing stream to open in edit mode */
  stream?: IncomeStream | null;
}

export function AddStreamModal({ open, onClose, stream }: Props) {
  const create = useCreateIncomeStream();
  const update = useUpdateIncomeStream();
  const isEdit = !!stream;

  const [name, setName] = useState("");
  const [type, setType] = useState<IncomeStreamType>("salary");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("25");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  // Pre-fill when editing
  useEffect(() => {
    if (stream && open) {
      setName(stream.name);
      setType(stream.type);
      setAmount(String(stream.amount));
      setCurrency(stream.currency);
      setFrequency(stream.frequency);
      setDayOfMonth(stream.day_of_month != null ? String(stream.day_of_month) : "25");
      setStartDate(typeof stream.start_date === "string" ? stream.start_date.slice(0, 10) : stream.start_date);
      setEndDate(stream.end_date ? (typeof stream.end_date === "string" ? stream.end_date.slice(0, 10) : stream.end_date) : "");
      setIsActive(stream.is_active);
      setNotes(stream.notes ?? "");
    } else if (!stream && open) {
      reset();
    }
  }, [stream, open]);

  function reset() {
    setName("");
    setType("salary");
    setAmount("");
    setCurrency("CHF");
    setFrequency("monthly");
    setDayOfMonth("25");
    setEndDate("");
    setIsActive(true);
    setNotes("");
    const d = new Date();
    setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;

    const payload: NewIncomeStream = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      currency,
      frequency,
      day_of_month: frequency === "monthly" || frequency === "quarterly" ? parseInt(dayOfMonth, 10) : null,
      start_date: startDate,
      end_date: endDate || null,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: stream!.id, updates: payload });
      } else {
        await create.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch {
      // error surfaced below
    }
  }

  const mutation = isEdit ? update : create;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--text-primary)]">
                  {isEdit ? "Edit Income Stream" : "Add Income Stream"}
                </h2>
                <button
                  onClick={onClose}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              {!isEdit && (
                <>
                  <UploadDropzone
                    kind="salary"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    headline="Drop a salary slip"
                    hint="PDF or image — we'll create the stream automatically"
                    onSuccess={onClose}
                    compact
                  />
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-[var(--color-whisper)]" />
                    <span className="text-[10.4px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                      or enter manually
                    </span>
                    <div className="flex-1 h-px bg-[var(--color-whisper)]" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Day Job"
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IncomeStreamType)}
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">End date (optional)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
                    />
                  </div>
                </div>

                {isEdit && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-active"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-[var(--border-color)] bg-[var(--bg-tertiary)]"
                    />
                    <label htmlFor="is-active" className="text-xs font-medium text-[var(--text-muted)]">Active</label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  />
                </div>

                {mutation.isError && (
                  <p className="text-xs text-[var(--color-negative)]">{mutation.error.message}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 rounded-[2px] border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-1 px-4 py-2 rounded-[2px] bg-[var(--color-charcoal)] text-white text-sm font-medium hover:bg-[var(--color-dark)] transition-colors disabled:opacity-50"
                  >
                    {mutation.isPending
                      ? isEdit ? "Saving..." : "Adding..."
                      : isEdit ? "Save Changes" : "Add Stream"}
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
