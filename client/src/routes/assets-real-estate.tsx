import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
  useCreateMortgage,
  useUpdateMortgage,
  useDeleteMortgage,
  useCreatePropertyCost,
  useUpdatePropertyCost,
  useDeletePropertyCost,
  useCreateIncomeStream,
  useUpdateIncomeStream,
  useDeleteIncomeStream,
} from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import type {
  PropertyType,
  PropertyWithDetails,
  PropertyMortgage,
  PropertyCost,
  PropertyCostCategory,
  IncomeStream,
  IncomeFrequency,
  NewIncomeStream,
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
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Real Estate</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Properties, mortgages, and rental income
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--color-charcoal)] text-white rounded-full text-sm font-medium hover:bg-[var(--color-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Total Value
          </p>
          <span className="text-xs text-[var(--text-muted)]">
            {properties?.length ?? 0} propert{(properties?.length ?? 0) === 1 ? "y" : "ies"}
          </span>
        </div>
        {isLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-[38px] font-serif font-light tracking-[-0.03em] text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totals.value} format={format} />
          </p>
        )}
        {!isLoading && (
          <div className="flex items-center gap-6 mt-2">
            <p className="text-xs text-[var(--text-muted)]">
              Equity:{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {format(totals.equity)}
              </span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Net monthly:{" "}
              <span className={`font-medium ${totals.netMonthly >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                {totals.netMonthly >= 0 ? "+" : ""}{format(totals.netMonthly)}
              </span>
            </p>
          </div>
        )}
      </motion.div>

      {/* Properties grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 h-48 animate-pulse" />
          ))}
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-3">No properties yet.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="text-sm font-medium text-[var(--color-charcoal)] hover:text-[var(--color-mid)] transition-colors"
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.35, ease: [0.25, 1, 0.5, 1] as const }}
      onClick={onClick}
      className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 cursor-pointer transition-colors hover:bg-[var(--color-snow)]"
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
        <p className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)] tabular-nums tracking-tight">
          {formatLocal(property.current_value, property.currency)}
        </p>
        {appreciation != null && (
          <p className="text-[11px] mt-0.5">
            <span className={appreciation >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}>
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
            property.net_monthly_income >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"
          }`}>
            {property.net_monthly_income >= 0 ? "+" : "-"}
            {formatLocalDecimals(Math.abs(property.net_monthly_income), property.currency)}
          </span>
        </div>
        {property.equity > 0 && property.monthly_rent > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--text-muted)]">Annual ROI on equity</span>
            <span className={`text-[11px] font-medium tabular-nums ${
              roi >= 0 ? "text-[var(--text-secondary)]" : "text-[var(--color-negative)]"
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
      <span className={`text-xs font-medium tabular-nums ${positive ? "text-[var(--color-positive)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}

// -------------------------------------------------------------------------------------
// Add property modal
// -------------------------------------------------------------------------------------

function AddPropertyModal({ open, onClose, editProperty }: { open: boolean; onClose: () => void; editProperty?: PropertyWithDetails | null }) {
  const create = useCreateProperty();
  const updateProp = useUpdateProperty();
  const isEditing = !!editProperty;
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("apartment");
  const [address, setAddress] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [currency, setCurrency] = useState("CHF");

  useEffect(() => {
    if (!open) return;
    if (editProperty) {
      setName(editProperty.name);
      setType(editProperty.property_type);
      setAddress(editProperty.address ?? "");
      setCurrentValue(String(editProperty.current_value));
      setPurchasePrice(editProperty.purchase_price != null ? String(editProperty.purchase_price) : "");
      setPurchaseDate(editProperty.purchase_date ?? "");
      setCurrency(editProperty.currency);
    } else {
      setName("");
      setType("apartment");
      setAddress("");
      setCurrentValue("");
      setPurchasePrice("");
      setPurchaseDate("");
      setCurrency("CHF");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProperty]);

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
      if (isEditing && editProperty) {
        await updateProp.mutateAsync({ id: editProperty.id, updates: input });
      } else {
        await create.mutateAsync(input);
      }
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
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--text-primary)]">{isEditing ? "Edit Property" : "Add Property"}</h2>
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
                {(create.isError || updateProp.isError) && <p className="text-xs text-[var(--color-negative)]">{(create.error ?? updateProp.error)?.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={create.isPending || updateProp.isPending} className={submitBtn}>
                    {(create.isPending || updateProp.isPending)
                      ? (isEditing ? "Saving..." : "Adding...")
                      : (isEditing ? "Save Changes" : "Add Property")}
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
  const [addRentalOpen, setAddRentalOpen] = useState(false);
  const [editPropertyOpen, setEditPropertyOpen] = useState(false);
  const [editingMortgage, setEditingMortgage] = useState<PropertyMortgage | null>(null);
  const [editingCost, setEditingCost] = useState<PropertyCost | null>(null);
  const [editingRental, setEditingRental] = useState<IncomeStream | null>(null);
  const deleteStream = useDeleteIncomeStream();

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
            className="fixed inset-0 z-40 bg-black/60"
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
                  <h2 className="text-[18px] font-normal text-[var(--text-primary)]">{property.name}</h2>
                  {property.address && <p className="text-[11px] text-[var(--text-muted)]">{property.address}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditPropertyOpen(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--color-charcoal)] transition-colors"
                  title="Edit property"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
                    onClick={() => { setEditingMortgage(null); setAddMortgageOpen(true); }}
                    className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-mid)] font-medium"
                  >
                    + Add
                  </button>
                </div>
                {property.mortgages.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No mortgages.</p>
                ) : (
                  <div className="space-y-2">
                    {property.mortgages.map((m) => (
                      <MortgageRow key={m.id} propertyCurrency={property.currency} mortgage={m} onEdit={() => { setEditingMortgage(m); setAddMortgageOpen(true); }} />
                    ))}
                  </div>
                )}
              </section>

              {/* Costs */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recurring Costs</h3>
                  <button
                    onClick={() => { setEditingCost(null); setAddCostOpen(true); }}
                    className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-mid)] font-medium"
                  >
                    + Add
                  </button>
                </div>
                {property.costs.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No recurring costs.</p>
                ) : (
                  <div className="space-y-2">
                    {property.costs.map((c) => (
                      <CostRow key={c.id} cost={c} onEdit={() => { setEditingCost(c); setAddCostOpen(true); }} />
                    ))}
                  </div>
                )}
              </section>

              {/* Rent streams */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rental Income</h3>
                  <button
                    onClick={() => { setEditingRental(null); setAddRentalOpen(true); }}
                    className="text-xs text-[var(--color-charcoal)] hover:text-[var(--color-mid)] font-medium"
                  >
                    + Add
                  </button>
                </div>
                {property.rental_streams.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No rental income added.</p>
                ) : (
                  <div className="space-y-2">
                    {property.rental_streams.map((r) => (
                      <div
                        key={r.id}
                        className="group flex items-center justify-between py-2 px-3 rounded-[2px] bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[var(--text-primary)]">{r.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{r.frequency}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--color-positive)] tabular-nums">
                            +{formatLocalDecimals(r.amount, r.currency)}
                          </span>
                          <button
                            onClick={() => { setEditingRental(r); setAddRentalOpen(true); }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--color-charcoal)] transition-all"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Remove "${r.name}"?`)) return;
                              await deleteStream.mutateAsync(r.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--color-negative)] transition-all"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
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
                  className="w-full px-4 py-2 rounded-[2px] border border-[var(--color-negative)]/30 text-sm font-medium text-[var(--color-negative)] hover:bg-[var(--color-negative)]/10 transition-colors disabled:opacity-50"
                >
                  {deleteProp.isPending ? "Deleting..." : "Delete Property"}
                </button>
              </section>
            </div>
          </motion.aside>

          <AddPropertyModal
            open={editPropertyOpen}
            onClose={() => setEditPropertyOpen(false)}
            editProperty={property}
          />
          <AddMortgageModal
            propertyId={property.id}
            propertyCurrency={property.currency}
            open={addMortgageOpen}
            onClose={() => { setAddMortgageOpen(false); setEditingMortgage(null); }}
            editMortgage={editingMortgage}
          />
          <AddCostModal
            propertyId={property.id}
            propertyCurrency={property.currency}
            open={addCostOpen}
            onClose={() => { setAddCostOpen(false); setEditingCost(null); }}
            editCost={editingCost}
          />
          <AddRentalStreamModal
            propertyId={property.id}
            propertyCurrency={property.currency}
            open={addRentalOpen}
            onClose={() => { setAddRentalOpen(false); setEditingRental(null); }}
            editStream={editingRental}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color?: "green" | "red" }) {
  const colorClass = color === "green" ? "text-[var(--color-positive)]" : color === "red" ? "text-[var(--color-negative)]" : "text-[var(--text-primary)]";
  return (
    <div className="p-3 rounded-[2px] bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className={`text-[18px] font-medium tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
}

function MortgageRow({ mortgage, propertyCurrency, onEdit }: { mortgage: PropertyMortgage; propertyCurrency: string; onEdit: () => void }) {
  const deleteM = useDeleteMortgage();
  const monthlyInterest = (mortgage.current_balance * mortgage.interest_rate) / 12 / 100;

  return (
    <div className="flex items-start justify-between py-2 px-3 rounded-[2px] bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
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
      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="text-[var(--text-muted)] hover:text-[var(--color-charcoal)] transition-colors"
          title="Edit mortgage"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete mortgage "${mortgage.lender ?? "this mortgage"}"?`)) deleteM.mutate(mortgage.id);
          }}
          className="text-[var(--text-muted)] hover:text-[var(--color-negative)] transition-colors"
          title="Delete mortgage"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9M18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function CostRow({ cost, onEdit }: { cost: PropertyCost; onEdit: () => void }) {
  const deleteC = useDeletePropertyCost();
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-[2px] bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
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
      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="text-[var(--text-muted)] hover:text-[var(--color-charcoal)] transition-colors"
          title="Edit cost"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete cost "${cost.label}"?`)) deleteC.mutate(cost.id);
          }}
          className="text-[var(--text-muted)] hover:text-[var(--color-negative)] transition-colors"
          title="Delete cost"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9M18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" />
          </svg>
        </button>
      </div>
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
  editMortgage,
}: {
  propertyId: number;
  propertyCurrency: string;
  open: boolean;
  onClose: () => void;
  editMortgage?: PropertyMortgage | null;
}) {
  const create = useCreateMortgage();
  const updateM = useUpdateMortgage();
  const isEditing = !!editMortgage;
  const [lender, setLender] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editMortgage) {
      setLender(editMortgage.lender ?? "");
      setOriginalAmount(String(editMortgage.original_amount));
      setCurrentBalance(String(editMortgage.current_balance));
      setInterestRate(String(editMortgage.interest_rate));
      setStartDate(editMortgage.start_date ?? "");
    } else {
      setLender("");
      setOriginalAmount("");
      setCurrentBalance("");
      setInterestRate("");
      setStartDate("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMortgage]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!originalAmount || !currentBalance || !interestRate) return;
    const input: NewMortgage = {
      lender: lender.trim() || null,
      original_amount: parseFloat(originalAmount),
      current_balance: parseFloat(currentBalance),
      interest_rate: parseFloat(interestRate),
      start_date: startDate || null,
      is_active: editMortgage?.is_active ?? true,
    };
    try {
      if (isEditing && editMortgage) {
        await updateM.mutateAsync({ id: editMortgage.id, updates: input });
      } else {
        await create.mutateAsync({ propertyId, input });
      }
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
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--text-primary)]">{isEditing ? "Edit Mortgage" : "Add Mortgage"}</h2>
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
                {(create.isError || updateM.isError) && <p className="text-xs text-[var(--color-negative)]">{(create.error ?? updateM.error)?.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={create.isPending || updateM.isPending} className={submitBtn}>
                    {(create.isPending || updateM.isPending)
                      ? (isEditing ? "Saving..." : "Adding...")
                      : (isEditing ? "Save Changes" : "Add Mortgage")}
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
  editCost,
}: {
  propertyId: number;
  propertyCurrency: string;
  open: boolean;
  onClose: () => void;
  editCost?: PropertyCost | null;
}) {
  const create = useCreatePropertyCost();
  const updateC = useUpdatePropertyCost();
  const isEditing = !!editCost;
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<PropertyCostCategory>("maintenance");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");

  useEffect(() => {
    if (!open) return;
    if (editCost) {
      setLabel(editCost.label);
      setCategory(editCost.category as PropertyCostCategory);
      setAmount(String(editCost.amount));
      setFrequency(editCost.frequency as IncomeFrequency);
    } else {
      setLabel("");
      setCategory("maintenance");
      setAmount("");
      setFrequency("monthly");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editCost]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount) return;
    const input: NewPropertyCost = {
      label: label.trim(),
      category,
      amount: parseFloat(amount),
      currency: propertyCurrency,
      frequency,
      is_active: editCost?.is_active ?? true,
    };
    try {
      if (isEditing && editCost) {
        await updateC.mutateAsync({ id: editCost.id, updates: input });
      } else {
        await create.mutateAsync({ propertyId, input });
      }
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
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--text-primary)]">{isEditing ? "Edit Recurring Cost" : "Add Recurring Cost"}</h2>
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
                {(create.isError || updateC.isError) && <p className="text-xs text-[var(--color-negative)]">{(create.error ?? updateC.error)?.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={create.isPending || updateC.isPending} className={submitBtn}>
                    {(create.isPending || updateC.isPending)
                      ? (isEditing ? "Saving..." : "Adding...")
                      : (isEditing ? "Save Changes" : "Add Cost")}
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
// Add / edit rental stream modal
// -------------------------------------------------------------------------------------

function AddRentalStreamModal({
  propertyId,
  propertyCurrency,
  open,
  onClose,
  editStream,
}: {
  propertyId: number;
  propertyCurrency: string;
  open: boolean;
  onClose: () => void;
  editStream?: IncomeStream | null;
}) {
  const create = useCreateIncomeStream();
  const update = useUpdateIncomeStream();
  const isEditing = !!editStream;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(propertyCurrency);
  const [frequency, setFrequency] = useState<IncomeFrequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editStream) {
      setName(editStream.name);
      setAmount(String(editStream.amount));
      setCurrency(editStream.currency);
      setFrequency(editStream.frequency);
      setDayOfMonth(editStream.day_of_month != null ? String(editStream.day_of_month) : "1");
      setStartDate(typeof editStream.start_date === "string" ? editStream.start_date.slice(0, 10) : editStream.start_date);
      setNotes(editStream.notes ?? "");
    } else {
      setName("");
      setAmount("");
      setCurrency(propertyCurrency);
      setFrequency("monthly");
      setDayOfMonth("1");
      setNotes("");
      const d = new Date();
      setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editStream]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !amount || parseFloat(amount) <= 0) return;

    const payload: NewIncomeStream = {
      name: name.trim(),
      type: "rental",
      amount: parseFloat(amount),
      currency,
      frequency,
      day_of_month: frequency === "monthly" || frequency === "quarterly" ? parseInt(dayOfMonth, 10) : null,
      start_date: startDate,
      is_active: true,
      notes: notes.trim() || null,
      property_id: propertyId,
    };

    try {
      if (isEditing && editStream) {
        await update.mutateAsync({ id: editStream.id, updates: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      // ignore
    }
  }

  const mutation = isEditing ? update : create;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="rounded-[2px] border border-[var(--color-whisper)] bg-white w-full max-w-md p-6 pointer-events-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-normal text-[var(--text-primary)]">{isEditing ? "Edit Rental Income" : "Add Rental Income"}</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Name">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tenant rent" className={inputClass} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={`Gross amount (${currency})`}>
                    <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2500" className={`${inputClass} tabular-nums`} required />
                  </Field>
                  <Field label="Currency">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Frequency">
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as IncomeFrequency)} className={inputClass}>
                      {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </Field>
                  {(frequency === "monthly" || frequency === "quarterly") && (
                    <Field label="Day of month">
                      <input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className={`${inputClass} tabular-nums`} />
                    </Field>
                  )}
                </div>
                <Field label="Start date">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} required />
                </Field>
                <Field label="Notes (optional)">
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </Field>
                {mutation.isError && <p className="text-xs text-[var(--color-negative)]">{mutation.error.message}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={mutation.isPending} className={submitBtn}>
                    {mutation.isPending
                      ? (isEditing ? "Saving..." : "Adding...")
                      : (isEditing ? "Save Changes" : "Add Rental Income")}
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
  "w-full px-0 py-2 bg-transparent border-0 border-b border-[var(--color-whisper)] text-[15.7px] text-[var(--text-primary)] outline-none focus:border-[var(--color-charcoal)] transition-colors";
const cancelBtn =
  "flex-1 px-4 py-2 rounded-[2px] border border-[var(--border-color)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors";
const submitBtn =
  "flex-1 px-4 py-2 rounded-[2px] bg-[var(--color-charcoal)] text-white text-sm font-medium hover:bg-[var(--color-dark)] transition-colors disabled:opacity-50";

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
