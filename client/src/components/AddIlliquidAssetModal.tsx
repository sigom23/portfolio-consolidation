import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCreateIlliquidAsset, useUpdateIlliquidAsset } from "../hooks/usePortfolio";
import type { IlliquidAsset, IlliquidSubtype, NewIlliquidAsset } from "../types";

const CURRENCIES = ["CHF", "EUR", "USD", "GBP", "JPY", "CAD", "AUD"];

const PENSION_SUGGESTIONS = ["UBS Pillar 2", "UBS Pillar 3a", "Pillar 2 (BVG)", "Pillar 3a"];

const PE_STRATEGIES = [
  { value: "buyout", label: "Buyout" },
  { value: "growth", label: "Growth" },
  { value: "venture", label: "Venture" },
  { value: "secondaries", label: "Secondaries" },
  { value: "co_investment", label: "Co-investment" },
  { value: "other", label: "Other" },
];

const PE_STATUSES = [
  { value: "investing", label: "Investing" },
  { value: "harvesting", label: "Harvesting" },
  { value: "largely_realized", label: "Largely Realized" },
];

const fieldInput = "w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors";
const fieldInputNum = `${fieldInput} tabular-nums`;

interface Props {
  open: boolean;
  subtype: IlliquidSubtype | null;
  onClose: () => void;
  editAsset?: IlliquidAsset | null;
  prefill?: Partial<IlliquidAsset> | null;
}

const TITLES: Record<IlliquidSubtype, string> = {
  private_equity: "Add Private Equity Fund",
  pension: "Add Pension Account",
  unvested_equity: "Add Unvested Equity Grant",
  startup: "Add Startup Investment",
};

const EDIT_TITLES: Record<IlliquidSubtype, string> = {
  private_equity: "Edit Private Equity Fund",
  pension: "Edit Pension Account",
  unvested_equity: "Edit Unvested Equity Grant",
  startup: "Edit Startup Investment",
};

const SUBMIT_LABELS: Record<IlliquidSubtype, string> = {
  private_equity: "Add Fund",
  pension: "Add Account",
  unvested_equity: "Add Grant",
  startup: "Add Investment",
};

export function AddIlliquidAssetModal({ open, subtype, onClose, editAsset, prefill }: Props) {
  const create = useCreateIlliquidAsset();
  const update = useUpdateIlliquidAsset();
  const isEditing = !!editAsset;

  // Common
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("CHF");
  const [notes, setNotes] = useState("");

  // PE / Pension / Startup — current value (native currency)
  const [currentValue, setCurrentValue] = useState("");

  // PE extras
  const [committedCapital, setCommittedCapital] = useState("");
  const [calledCapital, setCalledCapital] = useState("");
  const [distributedCapital, setDistributedCapital] = useState("");
  const [vintageYear, setVintageYear] = useState("");
  const [strategy, setStrategy] = useState("");
  const [gpName, setGpName] = useState("");
  const [geography, setGeography] = useState("");
  const [fundStatus, setFundStatus] = useState("");

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

  // Reset/prefill form when modal opens
  useEffect(() => {
    if (!open) return;
    if (editAsset) {
      setName(editAsset.name);
      setCurrency(editAsset.currency);
      setNotes(editAsset.notes ?? "");
      setCurrentValue(editAsset.current_value != null ? String(editAsset.current_value) : "");
      setCommittedCapital(editAsset.committed_capital != null ? String(editAsset.committed_capital) : "");
      setCalledCapital(editAsset.called_capital != null ? String(editAsset.called_capital) : "");
      setDistributedCapital(editAsset.distributed_capital != null ? String(editAsset.distributed_capital) : "");
      setVintageYear(editAsset.vintage_year != null ? String(editAsset.vintage_year) : "");
      setStrategy(editAsset.strategy ?? "");
      setGpName(editAsset.gp_name ?? "");
      setGeography(editAsset.geography ?? "");
      setFundStatus(editAsset.fund_status ?? "");
      setEmployer(editAsset.employer ?? "");
      setUnits(editAsset.units != null ? String(editAsset.units) : "");
      setVestingYears(editAsset.vesting_years != null ? String(editAsset.vesting_years) : "4");
      setGrantStartDate(editAsset.grant_start_date ?? (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      })());
      setEndValue(editAsset.end_value != null ? String(editAsset.end_value) : "");
      setAmountInvested(editAsset.amount_invested != null ? String(editAsset.amount_invested) : "");
      setInvestmentDate(editAsset.investment_date ?? "");
    } else {
      // Use prefill values if available (from PDF upload), otherwise defaults
      const p = prefill;
      setName(p?.name ?? "");
      setCurrency(p?.currency ?? "CHF");
      setNotes(p?.notes ?? "");
      setCurrentValue(p?.current_value != null ? String(p.current_value) : "");
      setCommittedCapital(p?.committed_capital != null ? String(p.committed_capital) : "");
      setCalledCapital(p?.called_capital != null ? String(p.called_capital) : "");
      setDistributedCapital(p?.distributed_capital != null ? String(p.distributed_capital) : "");
      setVintageYear(p?.vintage_year != null ? String(p.vintage_year) : "");
      setStrategy(p?.strategy ?? "");
      setGpName(p?.gp_name ?? "");
      setGeography(p?.geography ?? "");
      setFundStatus(p?.fund_status ?? "");
      setEmployer(p?.employer ?? "");
      setUnits(p?.units != null ? String(p.units) : "");
      setVestingYears(p?.vesting_years != null ? String(p.vesting_years) : "4");
      setGrantStartDate(p?.grant_start_date ?? (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      })());
      setEndValue(p?.end_value != null ? String(p.end_value) : "");
      setAmountInvested(p?.amount_invested != null ? String(p.amount_invested) : "");
      setInvestmentDate(p?.investment_date ?? "");
    }
    create.reset();
    update.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subtype, editAsset, prefill]);

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
      distributed_capital: null,
      vintage_year: null,
      strategy: null,
      gp_name: null,
      geography: null,
      fund_status: null,
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
      input.distributed_capital = distributedCapital ? parseFloat(distributedCapital) : null;
      input.vintage_year = vintageYear ? parseInt(vintageYear, 10) : null;
      input.strategy = strategy || null;
      input.gp_name = gpName.trim() || null;
      input.geography = geography.trim() || null;
      input.fund_status = fundStatus || null;
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
      if (isEditing && editAsset) {
        await update.mutateAsync({ id: editAsset.id, updates: input });
      } else {
        await create.mutateAsync(input);
      }
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? EDIT_TITLES[subtype] : TITLES[subtype]}
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
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                    {/* GP / Manager */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">GP / Manager</label>
                      <input type="text" value={gpName} onChange={(e) => setGpName(e.target.value)} placeholder="e.g. Sequoia Capital" className={fieldInput} />
                    </div>

                    <ValueCurrencyRow
                      label="NAV (current value)"
                      value={currentValue}
                      onValueChange={setCurrentValue}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      required
                    />

                    {/* Capital fields */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Committed</label>
                        <input type="number" step="0.01" value={committedCapital} onChange={(e) => setCommittedCapital(e.target.value)} placeholder="0" className={fieldInputNum} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Called</label>
                        <input type="number" step="0.01" value={calledCapital} onChange={(e) => setCalledCapital(e.target.value)} placeholder="0" className={fieldInputNum} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Distributed</label>
                        <input type="number" step="0.01" value={distributedCapital} onChange={(e) => setDistributedCapital(e.target.value)} placeholder="0" className={fieldInputNum} />
                      </div>
                    </div>

                    {/* Context row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Vintage</label>
                        <input type="number" min="1990" max="2099" value={vintageYear} onChange={(e) => setVintageYear(e.target.value)} placeholder={String(new Date().getFullYear())} className={fieldInputNum} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Strategy</label>
                        <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className={fieldInput}>
                          <option value="">—</option>
                          {PE_STRATEGIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Status</label>
                        <select value={fundStatus} onChange={(e) => setFundStatus(e.target.value)} className={fieldInput}>
                          <option value="">—</option>
                          {PE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Geography */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Geography (optional)</label>
                      <input type="text" value={geography} onChange={(e) => setGeography(e.target.value)} placeholder="e.g. Global, US, Europe" className={fieldInput} />
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
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                          className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                          className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                        className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
                    className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  />
                </div>

                {(create.isError || update.isError) && (
                  <p className="text-xs text-red-500">{(create.error ?? update.error)?.message}</p>
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
                    disabled={create.isPending || update.isPending}
                    className="flex-1 px-4 py-2 rounded-[2px] bg-[var(--color-charcoal)] text-white text-sm font-medium hover:bg-[var(--color-dark)] transition-colors disabled:opacity-50"
                  >
                    {(create.isPending || update.isPending)
                      ? (isEditing ? "Saving..." : "Adding...")
                      : (isEditing ? "Save Changes" : SUBMIT_LABELS[subtype])}
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
          className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] tabular-nums outline-none focus:border-[var(--color-charcoal)] transition-colors"
          required={required}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Currency</label>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors"
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
