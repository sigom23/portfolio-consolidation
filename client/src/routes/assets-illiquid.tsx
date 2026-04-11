import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useIlliquidAssets, useDeleteIlliquidAsset } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { AddIlliquidAssetModal } from "../components/AddIlliquidAssetModal";
import {
  illiquidAssetNativeValue,
  computeUnvestedVestedValue,
  type IlliquidAsset,
  type IlliquidSubtype,
} from "../types";

// ============================================================
// Subtype configuration — order defines the section order on the page
// ============================================================
const SECTIONS: {
  key: IlliquidSubtype;
  label: string;
  emptyCopy: string;
  color: string;
}[] = [
  {
    key: "private_equity",
    label: "Private Equity",
    emptyCopy: "No private equity funds tracked yet.",
    color: "#8b5cf6",
  },
  {
    key: "pension",
    label: "Pension",
    emptyCopy: "No pension accounts tracked yet.",
    color: "#06b6d4",
  },
  {
    key: "unvested_equity",
    label: "Unvested Equity",
    emptyCopy: "No grants tracked yet.",
    color: "#3b82f6",
  },
  {
    key: "startup",
    label: "Startup Participation",
    emptyCopy: "No startup investments tracked yet.",
    color: "#f59e0b",
  },
];

// Converts a native-currency value to USD using live FX rates. Mirrors the
// server-side conversion so client-rendered numbers agree with holdings.
function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  if (!rates[ccy]) return amount;
  return amount / rates[ccy];
}

function AssetsIlliquidPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: assets, isLoading: assetsLoading } = useIlliquidAssets();
  const { format, baseCurrency, flag, rates } = useCurrency();
  const [modalSubtype, setModalSubtype] = useState<IlliquidSubtype | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  // Group assets by subtype and compute a USD total per asset (for totals)
  const grouped = useMemo(() => {
    const bySubtype: Record<IlliquidSubtype, IlliquidAsset[]> = {
      private_equity: [],
      pension: [],
      unvested_equity: [],
      startup: [],
    };
    for (const a of assets ?? []) {
      if (bySubtype[a.subtype]) bySubtype[a.subtype].push(a);
    }
    return bySubtype;
  }, [assets]);

  const totalUsd = useMemo(() => {
    let total = 0;
    for (const a of assets ?? []) {
      const native = illiquidAssetNativeValue(a);
      total += toUsd(native, a.currency, rates);
    }
    return total;
  }, [assets, rates]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Illiquid Assets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Private equity, pension, unvested equity, and startup participation
          </p>
        </div>
      </div>

      {/* Total value hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="hero-card rounded-2xl p-6 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Total Illiquid Value
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {assetsLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-4xl font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totalUsd} format={format} />
          </p>
        )}
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {assets?.length ?? 0} asset{(assets?.length ?? 0) === 1 ? "" : "s"} tracked
        </p>
      </motion.div>

      {/* Sections */}
      <div className="space-y-6">
        {SECTIONS.map((section, sectionIdx) => {
          const items = grouped[section.key];
          const sectionTotalUsd = items.reduce((sum, a) => {
            const native = illiquidAssetNativeValue(a);
            return sum + toUsd(native, a.currency, rates);
          }, 0);

          return (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + sectionIdx * 0.06,
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94] as const,
              }}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              {/* Section header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: section.color }}
                  />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {section.label}
                  </h2>
                  <span className="text-xs text-[var(--text-muted)]">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {items.length > 0 && (
                    <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      {format(sectionTotalUsd)}
                    </p>
                  )}
                  <button
                    onClick={() => setModalSubtype(section.key)}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Section body */}
              {assetsLoading ? (
                <div className="px-6 py-8 text-center text-[var(--text-muted)] text-sm">
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div className="px-6 py-8 text-center text-[var(--text-muted)] text-sm">
                  {section.emptyCopy}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]/50">
                  {items.map((asset) => (
                    <AssetRow key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </motion.section>
          );
        })}
      </div>

      <AddIlliquidAssetModal
        open={modalSubtype !== null}
        subtype={modalSubtype}
        onClose={() => setModalSubtype(null)}
      />
    </div>
  );
}

// ============================================================
// Per-asset row — shape changes per subtype to surface the right fields
// ============================================================
function AssetRow({ asset }: { asset: IlliquidAsset }) {
  const { format, rates } = useCurrency();
  const deleteMutation = useDeleteIlliquidAsset();
  const native = illiquidAssetNativeValue(asset);
  const valueUsd = toUsd(native, asset.currency, rates);

  function handleDelete() {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(asset.id);
  }

  return (
    <div className="group px-6 py-4 flex items-start justify-between gap-4 hover:bg-[var(--bg-tertiary)]/40 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{asset.name}</p>
        <SubtypeMeta asset={asset} />
        {asset.notes && (
          <p className="mt-1 text-xs text-[var(--text-muted)] italic truncate">{asset.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {format(valueUsd)}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {native.toLocaleString(undefined, { maximumFractionDigits: 0 })} {asset.currency}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          aria-label="Delete asset"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Subtype-specific metadata under the asset name. Shows only what's meaningful
 * for each kind of asset — e.g. committed/called for PE, vested % for unvested.
 */
function SubtypeMeta({ asset }: { asset: IlliquidAsset }) {
  switch (asset.subtype) {
    case "private_equity": {
      const bits: string[] = [];
      if (asset.committed_capital != null) {
        bits.push(`Committed ${formatCompact(asset.committed_capital, asset.currency)}`);
      }
      if (asset.called_capital != null) {
        bits.push(`Called ${formatCompact(asset.called_capital, asset.currency)}`);
      }
      return bits.length ? <MetaLine>{bits.join(" · ")}</MetaLine> : null;
    }
    case "pension":
      return null;
    case "unvested_equity": {
      const vested = computeUnvestedVestedValue(
        asset.end_value,
        asset.vesting_years,
        asset.grant_start_date
      );
      const total = asset.end_value ?? 0;
      const pct = total > 0 ? Math.round((vested / total) * 100) : 0;
      const bits: string[] = [];
      if (asset.employer) bits.push(asset.employer);
      if (asset.vesting_years != null) bits.push(`${asset.vesting_years}y vest`);
      bits.push(`${pct}% vested`);
      return <MetaLine>{bits.join(" · ")}</MetaLine>;
    }
    case "startup": {
      const bits: string[] = [];
      if (asset.amount_invested != null) {
        bits.push(`Invested ${formatCompact(asset.amount_invested, asset.currency)}`);
      }
      if (asset.investment_date) {
        bits.push(new Date(asset.investment_date).getFullYear().toString());
      }
      return bits.length ? <MetaLine>{bits.join(" · ")}</MetaLine> : null;
    }
  }
}

function MetaLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{children}</p>;
}

function formatCompact(value: number, currency: string): string {
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1_000_000) body = `${(value / 1_000_000).toFixed(2)}M`;
  else if (abs >= 1_000) body = `${(value / 1_000).toFixed(1)}K`;
  else body = value.toFixed(0);
  return `${body} ${currency}`;
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/illiquid",
  component: AssetsIlliquidPage,
});
