import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import {
  useProperties,
  useCreateProperty,
  useDeleteProperty,
  useCreateMortgage,
  useDeleteMortgage,
  useCreatePropertyCost,
  useDeletePropertyCost,
} from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import type {
  PropertyType,
  PropertyWithDetails,
  PropertyCostCategory,
  IncomeFrequency,
  NewProperty,
  NewMortgage,
  NewPropertyCost,
} from "../types";

// -------------------------------------------------------------------------------------
// Constants and helpers
// -------------------------------------------------------------------------------------

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: "apartment", label: "Apartment", icon: "\ud83c\udfe2" },
  { value: "house", label: "House", icon: "\ud83c\udfe0" },
  { value: "commercial", label: "Commercial", icon: "\ud83c\udfec" },
  { value: "land", label: "Land", icon: "\ud83c\udf33" },
  { value: "other", label: "Other", icon: "\ud83d\udccd" },
];

const COST_CATEGORIES: { value: PropertyCostCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "management", label: "Management" },
  { value: "other", label: "Other" },
];

const FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const CURRENCIES = ["USD", "EUR", "CHF", "GBP", "JPY", "CAD", "AUD"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  CHF: "Fr",
  JPY: "\u00a5",
  CAD: "C$",
  AUD: "A$",
};

function formatLocal(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + " ";
  if (currency === "JPY") return `${sym}${Math.round(value).toLocaleString()}`;
  return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatLocalDecimals(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + " ";
  if (currency === "JPY") return `${sym}${Math.round(value).toLocaleString()}`;
  return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  const rate = rates[ccy];
  if (!rate) return amount;
  return amount / rate;
}

function typeMeta(type: PropertyType) {
  return PROPERTY_TYPES.find((p) => p.value === type) ?? PROPERTY_TYPES[0];
}

// -------------------------------------------------------------------------------------
// Main page
// -------------------------------------------------------------------------------------

function RealEstatePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: properties, isLoading } = useProperties();
  const { format, rates } = useCurrency();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  const totals = useMemo(() => {
    if (!properties) return { value: 0, equity: 0, netMonthly: 0 };
    let value = 0;
    let equity = 0;
    let netMonthly = 0;
    for (const p of properties) {
      value += toUsd(p.current_value, p.currency, rates);
      equity += toUsd(p.equity, p.currency, rates);
      netMonthly += toUsd(p.net_monthly_income, p.currency, rates);
    }
    return { value, equity, netMonthly };
  }, [properties, rates]);

  const selected = properties?.find((p) => p.id === selectedId) ?? null;

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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Real Estate</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage your properties, mortgages, and rental income
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="hero-card rounded-2xl p-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Total Value</p>
          {isLoading ? (
            <div className="h-9 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
              <AnimatedNumber value={totals.value} format={format} />
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="card-elevated rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Equity</p>
          {isLoading ? (
            <div className="h-9 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
              <AnimatedNumber value={totals.equity} format={format} />
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="card-elevated rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">Net Monthly Income</p>
          {isLoading ? (
            <div className="h-9 w-40 bg-[var(--bg-tertiary)] rounded animate-pulse" />
          ) : (
            <p className={`text-3xl font-bold tabular-nums tracking-tight ${
              totals.netMonthly >= 0 ? "text-green-500" : "text-red-500"
            }`}>
              {totals.netMonthly >= 0 ? "+" : "-"}
              <AnimatedNumber value={Math.abs(totals.netMonthly)} format={format} />
            </p>
          )}
        </motion.div>
      </div>

      {/* Properties grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="card-elevated rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-3">No properties yet.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            Add your first property →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p, i) => (
            <PropertyCard
              key={p.id}
              property={p}
              index={i}
              onClick={() => setSelectedId(p.id)}
            />
          ))}
        </div>
      )}

      <AddPropertyModal open={addOpen} onClose={() => setAddOpen(false)} />
      <PropertyDetailDrawer
        property={selected}
        open={selected != null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Property card
// -------------------------------------------------------------------------------------

function PropertyCard({
  property,
  index,
  onClick,
}: {
  property: PropertyWithDetails;
  index: number;
  onClick: () => void;
}) {
  const meta = typeMeta(property.property_type);
  const appreciation = property.purchase_price
    ? ((property.current_value - property.purchase_price) / property.purchase_price) * 100
    : null;
  const roi = property.equity > 0
    ? ((property.net_monthly_income * 12) / property.equity) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.35 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="card-elevated rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] leading-tight">{property.name}</h3>
            {property.address && (
              <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[180px]">{property.address}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {meta.label}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
          {formatLocal(property.current_value, property.currency)}
        </p>
        {appreciation != null && (
          <p className="text-[11px] mt-0.5">
            <span className={appreciation >= 0 ? "text-green-500" : "text-red-500"}>
              {appreciation >= 0 ? "+" : ""}
              {appreciation.toFixed(1)}%
            </span>
            <span className="text-[var(--text-muted)]"> vs purchase</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5 pt-3 border-t border-[var(--border-color)]">
        <Row label="Mortgage" value={formatLocal(property.total_mortgage_balance, property.currency)} />
        <Row label="Equity" value={formatLocal(property.equity, property.currency)} />
        <Row
          label="Monthly rent"
          value={formatLocalDecimals(property.monthly_rent, property.currency)}
          positive={property.monthly_rent > 0}
        />
        <Row
          label="Monthly costs"
          value={`-${formatLocalDecimals(property.monthly_costs + property.monthly_mortgage_interest, property.currency)}`}
        />
        <div className="pt-2 border-t border-[var(--border-color)]/50 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Net / month</span>
          <span className={`text-sm font-bold tabular-nums ${
            property.net_monthly_income >= 0 ? "text-green-500" : "text-red-500"
          }`}>
            {property.net_monthly_income >= 0 ? "+" : "-"}
            {formatLocalDecimals(Math.abs(property.net_monthly_income), property.currency)}
          </span>
        </div>
        {property.equity > 0 && property.monthly_rent > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--text-muted)]">Annual ROI on equity</span>
            <span className={`text-[11px] font-medium tabular-nums ${
              roi >= 0 ? "text-[var(--text-secondary)]" : "text-red-500"
            }`}>
              {roi.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${positive ? "text-green-500" : "text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Add property modal
// -------------------------------------------------------------------------------------

function AddPropertyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateProperty();
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("apartment");
  const [address, setAddress] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currency, setCurrency] = useState("CHF");

  function reset() {
    setName("");
    setType("apartment");
    setAddress("");
    setCurrentValue("");
    setPurchasePrice("");
    setPurchaseDate("");
    setCurrency("CHF");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !currentValue) return;

    const input: NewProperty = {
      name: name.trim(),
      property_type: type,
      address: address.trim() || null,
      current_value: parseFloat(currentValue),
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      currency,
    };

    try {
      await create.mutateAsync(input);
      reset();
      onClose();
    } catch {
      // error shown below
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="hero-card rounded-2xl w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Property</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Lake House"
                    className={inputClass}
                    required
                  />
                </Field>
                <Field label="Type">
                  <select value={type} onChange={(e) => setType(e.target.value as PropertyType)} className={inputClass}>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Address (optional)">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Seestrasse 12, Kilchberg"
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Current value">
                    <input
                      type="number"
                      step="1000"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      placeholder="850000"
                      className={`${inputClass} tabular-nums`}
                      required
                    />
                  </Field>
                  <Field label="Currency">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Purchase price">
                    <input
                      type="number"
                      step="1000"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="720000"
                      className={`${inputClass} tabular-nums`}
                    />
                  </Field>
                  <Field label="Purchase date">
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                {create.isError && <p className="text-xs text-red-500">{create.error.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={create.isPending} className={submitBtn}>
                    {create.isPending ? "Adding..." : "Add Property"}
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

// -------------------------------------------------------------------------------------
// Property detail drawer
// -------------------------------------------------------------------------------------

function PropertyDetailDrawer({
  property,
  open,
  onClose,
}: {
  property: PropertyWithDetails | null;
  open: boolean;
  onClose: () => void;
}) {
  const deleteProp = useDeleteProperty();
  const [addMortgageOpen, setAddMortgageOpen] = useState(false);
  const [addCostOpen, setAddCostOpen] = useState(false);

  if (!property) return null;

  const meta = typeMeta(property.property_type);

  async function handleDelete() {
    if (!property) return;
    if (!confirm(`Delete "${property.name}"? This removes all mortgages and costs. Rental streams will be unlinked.`)) return;
    try {
      await deleteProp.mutateAsync(property.id);
      onClose();
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 z-50 h-screen w-full max-w-xl bg-[var(--bg-secondary)] border-l border-[var(--border-color)] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{property.name}</h2>
                  {property.address && <p className="text-[11px] text-[var(--text-muted)]">{property.address}</p>}
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryBox label="Value" value={formatLocal(property.current_value, property.currency)} />
                <SummaryBox label="Equity" value={formatLocal(property.equity, property.currency)} />
                <SummaryBox
                  label="Net / month"
                  value={`${property.net_monthly_income >= 0 ? "+" : "-"}${formatLocalDecimals(Math.abs(property.net_monthly_income), property.currency)}`}
                  color={property.net_monthly_income >= 0 ? "green" : "red"}
                />
                <SummaryBox
                  label="Interest / month"
                  value={formatLocalDecimals(property.monthly_mortgage_interest, property.currency)}
                />
              </div>

              {/* Mortgages */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Mortgages</h3>
                  <button
                    onClick={() => setAddMortgageOpen(true)}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                  >
                    + Add
                  </button>
                </div>
                {property.mortgages.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No mortgages.</p>
                ) : (
                  <div className="space-y-2">
                    {property.mortgages.map((m) => (
                      <MortgageRow key={m.id} propertyCurrency={property.currency} mortgage={m} />
                    ))}
                  </div>
                )}
              </section>

              {/* Costs */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recurring Costs</h3>
                  <button
                    onClick={() => setAddCostOpen(true)}
                    className="text-xs text-blue-500 hover:text-blue-400 font-medium"
                  >
                    + Add
                  </button>
                </div>
                {property.costs.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No recurring costs.</p>
                ) : (
                  <div className="space-y-2">
                    {property.costs.map((c) => (
                      <CostRow key={c.id} cost={c} />
                    ))}
                  </div>
                )}
              </section>

              {/* Rent streams */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rental Income</h3>
                </div>
                {property.rental_streams.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    No rental streams linked. Add one from the Cash Flow page as a "Rental" stream and link this property.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {property.rental_streams.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]"
                      >
                        <div>
                          <p className="text-xs font-medium text-[var(--text-primary)]">{r.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{r.frequency}</p>
                        </div>
                        <span className="text-xs font-semibold text-green-500 tabular-nums">
                          +{formatLocalDecimals(r.amount, r.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Danger zone */}
              <section className="pt-6 border-t border-[var(--border-color)]">
                <button
                  onClick={handleDelete}
                  disabled={deleteProp.isPending}
                  className="w-full px-4 py-2 rounded-lg border border-red-500/30 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  {deleteProp.isPending ? "Deleting..." : "Delete Property"}
                </button>
              </section>
            </div>
          </motion.aside>

          <AddMortgageModal
            propertyId={property.id}
            propertyCurrency={property.currency}
            open={addMortgageOpen}
            onClose={() => setAddMortgageOpen(false)}
          />
          <AddCostModal
            propertyId={property.id}
            propertyCurrency={property.currency}
            open={addCostOpen}
            onClose={() => setAddCostOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color?: "green" | "red" }) {
  const colorClass = color === "green" ? "text-green-500" : color === "red" ? "text-red-500" : "text-[var(--text-primary)]";
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
}

function MortgageRow({ mortgage, propertyCurrency }: { mortgage: import("../types").PropertyMortgage; propertyCurrency: string }) {
  const deleteM = useDeleteMortgage();
  const monthlyInterest = (mortgage.current_balance * mortgage.interest_rate) / 12 / 100;

  return (
    <div className="flex items-start justify-between py-2 px-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {mortgage.lender ?? "Mortgage"}
          </p>
          {!mortgage.is_active && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">INACTIVE</span>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {formatLocal(mortgage.current_balance, propertyCurrency)} @ {mortgage.interest_rate.toFixed(2)}% = {formatLocalDecimals(monthlyInterest, propertyCurrency)}/mo interest
        </p>
      </div>
      <button
        onClick={() => {
          if (confirm(`Delete mortgage "${mortgage.lender ?? "this mortgage"}"?`)) deleteM.mutate(mortgage.id);
        }}
        className="text-[var(--text-muted)] hover:text-red-500 transition-colors ml-2 flex-shrink-0"
        title="Delete mortgage"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9M18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
        </svg>
      </button>
    </div>
  );
}

function CostRow({ cost }: { cost: import("../types").PropertyCost }) {
  const deleteC = useDeletePropertyCost();
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{cost.label}</p>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase">
            {cost.category}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          {formatLocalDecimals(cost.amount, cost.currency)} / {cost.frequency}
        </p>
      </div>
      <button
        onClick={() => {
          if (confirm(`Delete cost "${cost.label}"?`)) deleteC.mutate(cost.id);
        }}
        className="text-[var(--text-muted)] hover:text-red-500 transition-colors ml-2 flex-shrink-0"
        title="Delete cost"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9M18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
        </svg>
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Add mortgage modal
// -------------------------------------------------------------------------------------

function AddMortgageModal({
  propertyId,
  propertyCurrency,
  open,
  onClose,
}: {
  propertyId: number;
  propertyCurrency: string;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateMortgage();
  const [lender, setLender] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!originalAmount || !currentBalance || !interestRate) return;
    const input: NewMortgage = {
      lender: lender.trim() || null,
      original_amount: parseFloat(originalAmount),
      current_balance: parseFloat(currentBalance),
      interest_rate: parseFloat(interestRate),
      start_date: startDate || null,
      is_active: true,
    };
    try {
      await create.mutateAsync({ propertyId, input });
      setLender("");
      setOriginalAmount("");
      setCurrentBalance("");
      setInterestRate("");
      setStartDate("");
      onClose();
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="hero-card rounded-2xl w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Mortgage</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Lender (optional)">
                  <input type="text" value={lender} onChange={(e) => setLender(e.target.value)} placeholder="UBS" className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`Original (${propertyCurrency})`}>
                    <input type="number" step="1000" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} className={`${inputClass} tabular-nums`} required />
                  </Field>
                  <Field label={`Current (${propertyCurrency})`}>
                    <input type="number" step="1000" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} className={`${inputClass} tabular-nums`} required />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Interest rate %">
                    <input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="1.85" className={`${inputClass} tabular-nums`} required />
                  </Field>
                  <Field label="Start date">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </Field>
                </div>
                {create.isError && <p className="text-xs text-red-500">{create.error.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={create.isPending} className={submitBtn}>
                    {create.isPending ? "Adding..." : "Add Mortgage"}
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

// -------------------------------------------------------------------------------------
// Add cost modal
// -------------------------------------------------------------------------------------

function AddCostModal({
  propertyId,
  propertyCurrency,
  open,
  onClose,
}: {
  propertyId: number;
  propertyCurrency: string;
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreatePropertyCost();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<PropertyCostCategory>("maintenance");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount) return;
    const input: NewPropertyCost = {
      label: label.trim(),
      category,
      amount: parseFloat(amount),
      currency: propertyCurrency,
      frequency,
      is_active: true,
    };
    try {
      await create.mutateAsync({ propertyId, input });
      setLabel("");
      setCategory("maintenance");
      setAmount("");
      setFrequency("monthly");
      onClose();
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="hero-card rounded-2xl w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Recurring Cost</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Label">
                  <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Building insurance" className={inputClass} required />
                </Field>
                <Field label="Category">
                  <select value={category} onChange={(e) => setCategory(e.target.value as PropertyCostCategory)} className={inputClass}>
                    {COST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`Amount (${propertyCurrency})`}>
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} tabular-nums`} required />
                  </Field>
                  <Field label="Frequency">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as IncomeFrequency)} className={inputClass}>
                      {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </Field>
                </div>
                {create.isError && <p className="text-xs text-red-500">{create.error.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={create.isPending} className={submitBtn}>
                    {create.isPending ? "Adding..." : "Add Cost"}
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

// -------------------------------------------------------------------------------------
// Shared form bits
// -------------------------------------------------------------------------------------

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors";
const cancelBtn =
  "flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors";
const submitBtn =
  "flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/real-estate",
  component: RealEstatePage,
});
