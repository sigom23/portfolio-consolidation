import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useIlliquidAssets, useDeleteIlliquidAsset, useUploadPEStatement, useParsePEStatementNew } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { AddIlliquidAssetModal } from "../components/AddIlliquidAssetModal";
import { Plus, Upload } from "lucide-react";
import {
  illiquidAssetNativeValue,
  computeUnvestedVestedValue,
  type IlliquidAsset,
  type IlliquidSubtype,
} from "../types";

// ============================================================
// Tab configuration
// ============================================================
const TABS: {
  key: IlliquidSubtype;
  label: string;
  emptyCopy: string;
  color: string;
}[] = [
  { key: "private_equity", label: "Private Equity", emptyCopy: "No private equity funds tracked yet.", color: "#A89B8C" },
  { key: "pension", label: "Pension", emptyCopy: "No pension accounts tracked yet.", color: "#7D8E7B" },
  { key: "unvested_equity", label: "Unvested Equity", emptyCopy: "No grants tracked yet.", color: "#6B7B8D" },
  { key: "startup", label: "Startup", emptyCopy: "No startup investments tracked yet.", color: "#8E87A5" },
];

const STRATEGY_LABELS: Record<string, string> = {
  buyout: "Buyout", growth: "Growth", venture: "Venture",
  secondaries: "Secondaries", co_investment: "Co-invest", other: "Other",
};
const STATUS_LABELS: Record<string, string> = {
  investing: "Investing", harvesting: "Harvesting", largely_realized: "Largely Realized",
};

function toUsd(amount: number, currency: string, rates: Record<string, number>): number {
  const ccy = currency.toUpperCase();
  if (ccy === "USD") return amount;
  if (!rates[ccy]) return amount;
  return amount / rates[ccy];
}

// ============================================================
// Main page
// ============================================================
function AssetsIlliquidPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/assets/illiquid" });
  const activeTab = (search as { tab?: string }).tab as IlliquidSubtype | undefined;
  const { data: assets, isLoading: assetsLoading } = useIlliquidAssets();
  const { format, baseCurrency, flag, rates } = useCurrency();
  const [modalSubtype, setModalSubtype] = useState<IlliquidSubtype | null>(null);
  const [editingAsset, setEditingAsset] = useState<IlliquidAsset | null>(null);
  const [prefill, setPrefill] = useState<Partial<IlliquidAsset> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/" });
  }, [authLoading, user, navigate]);

  const grouped = useMemo(() => {
    const bySubtype: Record<IlliquidSubtype, IlliquidAsset[]> = {
      private_equity: [], pension: [], unvested_equity: [], startup: [],
    };
    for (const a of assets ?? []) {
      if (bySubtype[a.subtype]) bySubtype[a.subtype].push(a);
    }
    return bySubtype;
  }, [assets]);

  const totalUsd = useMemo(() => {
    let total = 0;
    for (const a of assets ?? []) {
      total += toUsd(illiquidAssetNativeValue(a), a.currency, rates);
    }
    return total;
  }, [assets, rates]);

  // Resolve current tab — default to first tab that has items, or private_equity
  const currentTab: IlliquidSubtype =
    activeTab && TABS.some((t) => t.key === activeTab)
      ? activeTab
      : TABS.find((t) => grouped[t.key].length > 0)?.key ?? "private_equity";

  const tabMeta = TABS.find((t) => t.key === currentTab)!;
  const tabItems = grouped[currentTab];

  function setTab(key: IlliquidSubtype) {
    navigate({ to: "/assets/illiquid", search: { tab: key }, replace: true });
  }

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
          <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Illiquid Assets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Private equity, pension, unvested equity, and startup participation
          </p>
        </div>
        <button
          onClick={() => { setEditingAsset(null); setModalSubtype(currentTab); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-charcoal)] text-white rounded-full text-[14px] font-medium hover:bg-[var(--color-dark)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          Add {tabMeta.label}
        </button>
      </div>

      {/* Total value hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            Illiquid Value
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {assetsLoading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-[38px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totalUsd} format={format} />
          </p>
        )}
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {assets?.length ?? 0} asset{(assets?.length ?? 0) === 1 ? "" : "s"} tracked
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border-color)]">
        {TABS.map((tab) => {
          const isActive = tab.key === currentTab;
          const count = grouped[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tab.color }}
                />
                {tab.label}
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] tabular-nums">
                    {count}
                  </span>
                )}
              </span>
              {isActive && (
                <motion.div
                  layoutId="illiquid-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: tab.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={currentTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {currentTab === "private_equity" ? (
          <PETab
            items={tabItems}
            loading={assetsLoading}
            emptyCopy={tabMeta.emptyCopy}
            onAdd={() => { setEditingAsset(null); setModalSubtype("private_equity"); }}
            onEdit={(a) => { setEditingAsset(a); setModalSubtype(a.subtype); }}
            onCreatePrefilled={(a) => { setEditingAsset(null); setModalSubtype("private_equity"); setPrefill(a); }}
          />
        ) : (
          <GenericTab
            items={tabItems}
            loading={assetsLoading}
            emptyCopy={tabMeta.emptyCopy}
            tabKey={currentTab}
            onAdd={() => { setEditingAsset(null); setModalSubtype(currentTab); }}
            onEdit={(a) => { setEditingAsset(a); setModalSubtype(a.subtype); }}
          />
        )}
      </motion.div>

      <AddIlliquidAssetModal
        open={modalSubtype !== null}
        subtype={modalSubtype}
        editAsset={editingAsset}
        prefill={prefill}
        onClose={() => { setModalSubtype(null); setEditingAsset(null); setPrefill(null); }}
      />
    </div>
  );
}

// ============================================================
// PE Tab — stacked capital bar layout
// ============================================================

// Bar colors — tonal, restrained, matching the premium palette
const BAR_CALLED = "#A89B8C";        // violet — capital drawn
const BAR_DISTRIBUTED = "#6E9E96";   // green — cash returned
const BAR_NAV = "#6B7B8D";           // blue — unrealized value

function PETab({
  items,
  loading,
  emptyCopy,
  onAdd,
  onEdit,
  onCreatePrefilled,
}: {
  items: IlliquidAsset[];
  loading: boolean;
  emptyCopy: string;
  onAdd: () => void;
  onEdit: (a: IlliquidAsset) => void;
  onCreatePrefilled: (a: Partial<IlliquidAsset>) => void;
}) {
  const { format, rates } = useCurrency();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const parseNewMutation = useParsePEStatementNew();
  const newFileInputRef = useRef<HTMLInputElement>(null);

  async function handleNewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const result = await parseNewMutation.mutateAsync(file);
      const ex = result.extracted;
      onCreatePrefilled({
        name: ex.fund_name ?? undefined,
        current_value: ex.nav,
        committed_capital: ex.committed_capital,
        called_capital: ex.called_capital,
        distributed_capital: ex.distributed_capital,
        currency: ex.currency,
        gp_name: ex.gp_name,
        vintage_year: ex.vintage_year,
        strategy: ex.strategy,
      } as Partial<IlliquidAsset>);
    } catch {
      // error shown via mutation state
    }
  }

  const totals = useMemo(() => {
    let nav = 0, committed = 0, called = 0, distributed = 0;
    for (const a of items) {
      nav += toUsd(a.current_value ?? 0, a.currency, rates);
      committed += toUsd(a.committed_capital ?? 0, a.currency, rates);
      called += toUsd(a.called_capital ?? 0, a.currency, rates);
      distributed += toUsd(a.distributed_capital ?? 0, a.currency, rates);
    }
    const uncalled = committed - called;
    const tvpi = called > 0 ? (nav + distributed) / called : 0;
    const dpi = called > 0 ? distributed / called : 0;
    return { nav, committed, called, distributed, uncalled, tvpi, dpi };
  }, [items, rates]);

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)] text-sm">Loading...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[2px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
        <p className="text-[var(--text-muted)] text-sm mb-3">{emptyCopy}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onAdd} className="text-sm font-medium text-[var(--color-charcoal)] hover:text-[var(--color-mid)] transition-colors">
            Add manually
          </button>
          <span className="text-[var(--text-muted)] text-sm">or</span>
          <button
            onClick={() => newFileInputRef.current?.click()}
            disabled={parseNewMutation.isPending}
            className="text-sm font-medium text-[var(--color-charcoal)] hover:text-[var(--color-mid)] transition-colors disabled:opacity-50"
          >
            {parseNewMutation.isPending ? "Parsing..." : "Upload a statement"}
          </button>
          <input
            ref={newFileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleNewUpload}
          />
        </div>
        {parseNewMutation.isError && (
          <p className="mt-3 text-xs text-[var(--color-negative)]">{parseNewMutation.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Commitment" value={format(totals.committed)} />
        <KpiCard label="NAV" value={format(totals.nav)} />
        <KpiCard label="Distributed" value={format(totals.distributed)} />
        <KpiCard label="Uncalled" value={format(totals.uncalled)} />
        <KpiCard label="TVPI" value={`${totals.tvpi.toFixed(2)}x`} accent={totals.tvpi >= 1} />
        <KpiCard label="DPI" value={`${totals.dpi.toFixed(2)}x`} accent={totals.dpi >= 1} />
      </div>

      {/* Bar legend */}
      <div className="flex items-center gap-5 px-1">
        <LegendDot color={BAR_CALLED} label="Called" />
        <LegendDot color={BAR_DISTRIBUTED} label="Distributed" />
        <LegendDot color={BAR_NAV} label="NAV" />
      </div>

      {/* Fund rows */}
      <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden divide-y divide-[var(--border-color)]/50">
        {items.map((fund) => (
          <PEFundRow
            key={fund.id}
            fund={fund}
            expanded={expandedId === fund.id}
            onToggle={() => setExpandedId(expandedId === fund.id ? null : fund.id)}
            onEdit={(overrides) => onEdit(overrides ? { ...fund, ...overrides } : fund)}
          />
        ))}

        {/* Add / Upload row */}
        <div className="px-6 py-4 flex justify-center gap-3">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--color-faint)] text-[12.5px] font-medium text-[var(--color-mid)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Add Fund
          </button>
          <button
            onClick={() => newFileInputRef.current?.click()}
            disabled={parseNewMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--color-faint)] text-[12.5px] font-medium text-[var(--color-mid)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors disabled:opacity-50"
          >
            <Upload className="w-3 h-3" strokeWidth={1.5} />
            {parseNewMutation.isPending ? "Parsing..." : "Upload Statement"}
          </button>
          <input
            ref={newFileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleNewUpload}
          />
        </div>
        {parseNewMutation.isError && (
          <p className="px-6 pb-4 text-xs text-[var(--color-negative)] text-center">{parseNewMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Fund row with stacked capital bar
// ============================================================
function PEFundRow({
  fund,
  expanded,
  onToggle,
  onEdit,
}: {
  fund: IlliquidAsset;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (overrides?: Partial<IlliquidAsset>) => void;
}) {
  const { format } = useCurrency();
  const deleteMutation = useDeleteIlliquidAsset();
  const uploadMutation = useUploadPEStatement();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nav = fund.current_value ?? 0;
  const committed = fund.committed_capital ?? 0;
  const called = fund.called_capital ?? 0;
  const distributed = fund.distributed_capital ?? 0;
  const uncalled = committed - called;
  const tvpi = called > 0 ? (nav + distributed) / called : 0;
  const dpi = called > 0 ? distributed / called : 0;
  const rvpi = called > 0 ? nav / called : 0;
  const calledPct = committed > 0 ? (called / committed) * 100 : 0;
  const fundAge = fund.vintage_year ? new Date().getFullYear() - fund.vintage_year : null;

  function handleDelete() {
    if (!confirm(`Delete "${fund.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(fund.id);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected
    try {
      const result = await uploadMutation.mutateAsync({ fundId: fund.id, file });
      const ex = result.extracted;
      // Open edit modal prefilled with extracted values
      onEdit({
        current_value: ex.nav ?? fund.current_value,
        committed_capital: ex.committed_capital ?? fund.committed_capital,
        called_capital: ex.called_capital ?? fund.called_capital,
        distributed_capital: ex.distributed_capital ?? fund.distributed_capital,
        currency: ex.currency ?? fund.currency,
        gp_name: ex.gp_name ?? fund.gp_name,
        vintage_year: ex.vintage_year ?? fund.vintage_year,
        strategy: ex.strategy ?? fund.strategy,
      });
    } catch {
      // error shown via mutation state
    }
  }

  const fmtNative = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Context line: "2019 · Buyout · Europe"
  const contextBits: string[] = [];
  if (fund.vintage_year) contextBits.push(String(fund.vintage_year));
  if (fund.strategy) contextBits.push(STRATEGY_LABELS[fund.strategy] ?? fund.strategy);
  if (fund.geography) contextBits.push(fund.geography);

  return (
    <div>
      {/* Collapsed row */}
      <div
        onClick={onToggle}
        className="grid grid-cols-[minmax(140px,1fr)_minmax(160px,1.5fr)_auto_auto] items-center gap-5 px-6 py-5 cursor-pointer hover:bg-[var(--bg-tertiary)]/30 transition-colors"
      >
        {/* Col 1: Fund identity */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
            {fund.name}
            <StaleHint updatedAt={fund.updated_at} />
          </p>
          {contextBits.length > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{contextBits.join(" · ")}</p>
          )}
          {fund.gp_name && (
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{fund.gp_name}</p>
          )}
        </div>

        {/* Col 2: Two bars */}
        <div className="min-w-0 space-y-1.5">
          {/* Bar 1: Commitment = Called + Uncalled */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[var(--text-muted)] w-[52px] shrink-0 uppercase tracking-wider">Funding</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${calledPct}%`, backgroundColor: BAR_CALLED }}
              />
            </div>
          </div>
          {/* Bar 2: Value = Distributed + NAV (same scale as commitment) */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[var(--text-muted)] w-[52px] shrink-0 uppercase tracking-wider">Value</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden flex">
              {committed > 0 && distributed > 0 && (
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(distributed / committed) * 100}%`,
                    backgroundColor: BAR_DISTRIBUTED,
                    borderRadius: nav > 0 ? "9999px 0 0 9999px" : "9999px",
                  }}
                />
              )}
              {committed > 0 && nav > 0 && (
                <div
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(nav / committed) * 100}%`,
                    backgroundColor: BAR_NAV,
                    borderRadius: distributed > 0 ? "0 9999px 9999px 0" : "9999px",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Key metrics */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 shrink-0 tabular-nums text-right">
          <Metric label="TVPI" value={called > 0 ? `${tvpi.toFixed(2)}x` : "—"} accent={tvpi >= 1} />
          <Metric label="DPI" value={called > 0 ? `${dpi.toFixed(2)}x` : "—"} accent={dpi >= 1} />
          <Metric label="Called" value={committed > 0 ? `${calledPct.toFixed(0)}%` : "—"} />
        </div>

        {/* Col 4: Status + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          {fund.fund_status && (
            <span className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wide font-medium whitespace-nowrap">
              {STATUS_LABELS[fund.fund_status] ?? fund.fund_status}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-6 pb-6 pt-2 border-t border-[var(--border-color)]/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
              <DetailField label="Committed Capital" value={`${fmtNative(committed)} ${fund.currency}`} />
              <DetailField label="Called Capital" value={`${fmtNative(called)} ${fund.currency}`} sub={committed > 0 ? `${calledPct.toFixed(0)}% of commitment` : undefined} />
              <DetailField label="Distributed Capital" value={`${fmtNative(distributed)} ${fund.currency}`} />
              <DetailField label="NAV" value={`${fmtNative(nav)} ${fund.currency}`} />
              <DetailField label="Uncalled Capital" value={`${fmtNative(uncalled)} ${fund.currency}`} />
              <DetailField label="TVPI" value={called > 0 ? `${tvpi.toFixed(2)}x` : "—"} />
              <DetailField label="DPI" value={called > 0 ? `${dpi.toFixed(2)}x` : "—"} />
              <DetailField label="RVPI" value={called > 0 ? `${rvpi.toFixed(2)}x` : "—"} />
              {fundAge != null && <DetailField label="Fund Age" value={`${fundAge} year${fundAge === 1 ? "" : "s"}`} />}
              {fund.gp_name && <DetailField label="GP / Manager" value={fund.gp_name} />}
              {fund.geography && <DetailField label="Geography" value={fund.geography} />}
              {fund.strategy && <DetailField label="Strategy" value={STRATEGY_LABELS[fund.strategy] ?? fund.strategy} />}
            </div>
            {fund.notes && (
              <p className="mt-4 text-xs text-[var(--text-muted)] italic">{fund.notes}</p>
            )}

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-[var(--border-color)]/50 flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="px-3 py-1.5 rounded-[2px] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploadMutation.isPending}
                className="px-3 py-1.5 rounded-[2px] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                {uploadMutation.isPending ? "Parsing..." : "Upload Statement"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded-[2px] border border-[var(--color-negative)]/30 text-xs font-medium text-[var(--color-negative)] hover:bg-[var(--color-negative)]/10 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
              {uploadMutation.isError && (
                <span className="text-xs text-[var(--color-negative)]">{uploadMutation.error.message}</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Shared small components
// ============================================================
function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-4 rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">{label}</p>
      <p className={`text-[18px] font-medium tabular-nums tracking-tight ${accent ? "text-[var(--color-positive)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-xs font-semibold ${accent ? "text-[var(--color-positive)]" : "text-[var(--text-primary)]"}`}>{value}</p>
      <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DetailField({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ============================================================
// Generic tab — used for Pension, Unvested Equity, Startup
// ============================================================
function GenericTab({
  items,
  loading,
  emptyCopy,
  tabKey,
  onAdd,
  onEdit,
}: {
  items: IlliquidAsset[];
  loading: boolean;
  emptyCopy: string;
  tabKey: IlliquidSubtype;
  onAdd: () => void;
  onEdit: (a: IlliquidAsset) => void;
}) {
  const { format, rates } = useCurrency();
  const sectionTotalUsd = items.reduce((sum, a) => {
    return sum + toUsd(illiquidAssetNativeValue(a), a.currency, rates);
  }, 0);

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)] text-sm">Loading...</div>;
  }

  return (
    <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-[var(--text-muted)]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
          {items.length > 0 && (
            <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
              {format(sectionTotalUsd)}
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="px-2.5 py-1.5 rounded-[2px] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Body */}
      {items.length === 0 ? (
        <div className="px-6 py-8 text-center text-[var(--text-muted)] text-sm">
          {emptyCopy}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-color)]/50">
          {items.map((asset) => (
            <AssetRow key={asset.id} asset={asset} onEdit={() => onEdit(asset)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Per-asset row (generic) — used for Pension, Unvested, Startup
// ============================================================
function AssetRow({ asset, onEdit }: { asset: IlliquidAsset; onEdit: () => void }) {
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
        <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
          {asset.name}
          <StaleHint updatedAt={asset.updated_at} />
        </p>
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
        <button onClick={onEdit} aria-label="Edit asset" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-charcoal)] hover:bg-[var(--color-snow)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button onClick={handleDelete} disabled={deleteMutation.isPending} aria-label="Delete asset" className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-negative)] hover:bg-[var(--color-negative)]/10 disabled:opacity-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================
function SubtypeMeta({ asset }: { asset: IlliquidAsset }) {
  switch (asset.subtype) {
    case "private_equity": {
      const bits: string[] = [];
      if (asset.committed_capital != null) bits.push(`Committed ${formatCompact(asset.committed_capital, asset.currency)}`);
      if (asset.called_capital != null) bits.push(`Called ${formatCompact(asset.called_capital, asset.currency)}`);
      return bits.length ? <MetaLine>{bits.join(" · ")}</MetaLine> : null;
    }
    case "pension":
      return null;
    case "unvested_equity": {
      const vested = computeUnvestedVestedValue(asset.end_value, asset.vesting_years, asset.grant_start_date);
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
      if (asset.amount_invested != null) bits.push(`Invested ${formatCompact(asset.amount_invested, asset.currency)}`);
      if (asset.investment_date) bits.push(new Date(asset.investment_date).getFullYear().toString());
      return bits.length ? <MetaLine>{bits.join(" · ")}</MetaLine> : null;
    }
  }
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function StaleHint({ updatedAt }: { updatedAt: string }) {
  const age = Date.now() - new Date(updatedAt).getTime();
  if (age < NINETY_DAYS_MS) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wide font-medium" title="Value not updated in over 90 days">
      Review
    </span>
  );
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

// ============================================================
// Route
// ============================================================
export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/illiquid",
  component: AssetsIlliquidPage,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
});
