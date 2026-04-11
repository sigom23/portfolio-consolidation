import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCreateIlliquidAsset } from "../hooks/usePortfolio";
import type { IlliquidSubtype, NewIlliquidAsset } from "../types";

const CURRENCIES = ["CHF", "EUR", "USD", "GBP", "JPY", "CAD", "AUD"];

const PENSION_SUGGESTIONS = ["UBS Pillar 2", "UBS Pillar 3a", "Pillar 2 (BVG)", "Pillar 3a"];

interface Props {
  open: boolean;
  subtype: IlliquidSubtype | null;
  onClose: () => void;
}

const TITLES: Record<IlliquidSubtype, string> = {
  private_equity: "Add Private Equity Fund",
  pension: "Add Pension Account",
  unvested_equity: "Add Unvested Equity Grant",
  startup: "Add Startup Investment",
};

const SUBMIT_LABELS: Record<IlliquidSubtype, string> = {
  private_equity: "Add Fund",
  pension: "Add Account",
  unvested_equity: "Add Grant",
  startup: "Add Investment",
};

export function AddIlliquidAssetModal({ open, subtype, onClose }: Props) {
  const create = useCreateIlliquidAsset();

  // Common
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [notes, setNotes] = useState("");

  // PE / Pension / Startup — current value (native currency)
  const [currentValue, setCurrentValue] = useState("");

  // PE extras
  const [committedCapital, setCommittedCapital] = useState("");
  const [calledCapital, setCalledCapital] = useState("");

  // Unvested equity extras
  const [employer, setEmployer] = useState("");
  const [units, setUnits] = useState("");
  const [vestingYears, setVestingYears] = useState("4");
  const [grantStartDate, setGrantStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endValue, setEndValue] = useState("");

  // Startup extras
  const [amountInvested, setAmountInvested] = useState("");
  const [investmentDate, setInvestmentDate] = useState("");

  // Reset the form every time the modal opens with a (possibly new) subtype.
  // Prevents PE fields leaking into a subsequent Pension add, etc.
  useEffect(() => {
    if (!open) return;
    setName("");
    setCurrency("CHF");
    setNotes("");
    setCurrentValue("");
    setCommittedCapital("");
    setCalledCapital("");
    setEmployer("");
    setUnits("");
    setVestingYears("4");
    setGrantStartDate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    });
    setEndValue("");
    setAmountInvested("");
    setInvestmentDate("");
    create.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subtype]);

  if (!subtype) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subtype) return;
    if (!name.trim()) return;

    const input: NewIlliquidAsset = {
      subtype,
      name: name.trim(),
      currency,
      notes: notes.trim() || null,
      current_value: null,
      committed_capital: null,
      called_capital: null,
      employer: null,
      units: null,
      vesting_years: null,
      grant_start_date: null,
      end_value: null,
      amount_invested: null,
      investment_date: null,
    };

    if (subtype === "private_equity") {
      const cv = parseFloat(currentValue);
      if (isNaN(cv) || cv < 0) return;
      input.current_value = cv;
      input.committed_capital = committedCapital ? parseFloat(committedCapital) : null;
      input.called_capital = calledCapital ? parseFloat(calledCapital) : null;
    } else if (subtype === "pension") {
      const cv = parseFloat(currentValue);
      if (isNaN(cv) || cv < 0) return;
      input.current_value = cv;
    } else if (subtype === "unvested_equity") {
      const ev = parseFloat(endValue);
      const vy = parseInt(vestingYears, 10);
      if (isNaN(ev) || ev < 0) return;
      if (isNaN(vy) || vy <= 0) return;
      if (!grantStartDate) return;
      input.end_value = ev;
      input.vesting_years = vy;
      input.grant_start_date = grantStartDate;
      input.employer = employer.trim() || null;
      input.units = units ? parseFloat(units) : null;
    } else if (subtype === "startup") {
      const cv = parseFloat(currentValue);
      if (isNaN(cv) || cv < 0) return;
      input.current_value = cv;
      input.amount_invested = amountInvested ? parseFloat(amountInvested) : null;
      input.investment_date = investmentDate || null;
    }

    try {
      await create.mutateAsync(input);
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
            <div className="hero-card rounded-2xl w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {TITLES[subtype]}
                </h2>
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
                {/* Name — common */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    {subtype === "private_equity"
                      ? "Fund name"
                      : subtype === "pension"
                        ? "Account name"
                        : subtype === "unvested_equity"
                          ? "Grant name"
                          : "Company name"}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    list={subtype === "pension" ? "pension-suggestions" : undefined}
                    placeholder={
                      subtype === "private_equity"
                        ? "e.g. Sequoia Growth Fund V"
                        : subtype === "pension"
                          ? "e.g. UBS Pillar 2"
                          : subtype === "unvested_equity"
                            ? "e.g. Google GSU 2024"
                            : "e.g. Acme AI"
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                  {subtype === "pension" && (
                    <datalist id="pension-suggestions">
                      {PENSION_SUGGESTIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Subtype-specific fields */}
                {subtype === "private_equity" && (
                  <>
                    <ValueCurrencyRow
                      label="NAV (current value)"
                      value={currentValue}
                      onValueChange={setCurrentValue}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                          Committed
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={committedCapital}
                          onChange={(e) => setCommittedCapital(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                          Called
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={calledCapital}
                          onChange={(e) => setCalledCapital(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {subtype === "pension" && (
                  <ValueCurrencyRow
                    label="Current balance"
                    value={currentValue}
                    onValueChange={setCurrentValue}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    required
                  />
                )}

                {subtype === "unvested_equity" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Employer
                      </label>
                      <input
                        type="text"
                        value={employer}
                        onChange={(e) => setEmployer(e.target.value)}
                        placeholder="e.g. Google"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <ValueCurrencyRow
                      label="Estimated end value"
                      value={endValue}
                      onValueChange={setEndValue}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                          Vesting years
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={vestingYears}
                          onChange={(e) => setVestingYears(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                          Units (optional)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={units}
                          onChange={(e) => setUnits(e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Grant start date
                      </label>
                      <input
                        type="date"
                        value={grantStartDate}
                        onChange={(e) => setGrantStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                  </>
                )}

                {subtype === "startup" && (
                  <>
                    <ValueCurrencyRow
                      label="Current fair value"
                      value={currentValue}
                      onValueChange={setCurrentValue}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      required
                    />
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Amount invested (optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amountInvested}
                        onChange={(e) => setAmountInvested(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                        Investment date (optional)
                      </label>
                      <input
                        type="date"
                        value={investmentDate}
                        onChange={(e) => setInvestmentDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </>
                )}

                {/* Notes — common */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                    {create.isPending ? "Adding..." : SUBMIT_LABELS[subtype]}
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

/** Shared value + currency row — used by three of the four subtypes. */
function ValueCurrencyRow({
  label,
  value,
  onValueChange,
  currency,
  onCurrencyChange,
  required,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  currency: string;
  onCurrencyChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px] gap-3">
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] tabular-nums outline-none focus:border-blue-500 transition-colors"
          required={required}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Currency</label>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
