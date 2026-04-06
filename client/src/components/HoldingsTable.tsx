import { useState } from "react";
import type { Holding } from "../types";
import { useCurrency } from "../contexts/CurrencyContext";

interface Props {
  holdings: Holding[];
  loading: boolean;
}

function SourceBadge({ type }: { type: string }) {
  const isWallet = type === "wallet";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
        isWallet
          ? "bg-purple-500/10 text-purple-500"
          : "bg-blue-500/10 text-blue-500"
      }`}
    >
      {isWallet ? "Wallet" : "Upload"}
    </span>
  );
}

function FigiDetail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wide">{label}</span>
      <p className="text-xs text-[var(--text-primary)] font-mono">{value}</p>
    </div>
  );
}

const SPAM_THRESHOLD = 1;

export function HoldingsTable({ holdings, loading }: Props) {
  const { format, baseCurrency } = useCurrency();
  const [hideSpam, setHideSpam] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const spamCount = holdings.filter((h) => (h.value_usd ?? 0) < SPAM_THRESHOLD && h.source_type === "wallet").length;
  const filtered = hideSpam
    ? holdings.filter((h) => (h.value_usd ?? 0) >= SPAM_THRESHOLD || h.source_type !== "wallet")
    : holdings;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden transition-colors">
      <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Holdings</h2>
        {spamCount > 0 && (
          <button
            onClick={() => setHideSpam(!hideSpam)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <div
              className={`w-8 h-4 rounded-full relative transition-colors ${
                hideSpam ? "bg-blue-500" : "bg-[var(--bg-tertiary)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  hideSpam ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            Hide spam ({spamCount})
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-[var(--text-muted)] border-b border-[var(--border-color)]">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Ticker</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium text-right">Quantity</th>
              <th className="px-6 py-3 font-medium text-right">Value ({baseCurrency})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-color)]/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-3">
                      <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No holdings yet. Upload a statement or connect a wallet to get started.
                </td>
              </tr>
            ) : (
              filtered.map((h) => {
                const hasFigi = h.figi || h.composite_figi || h.security_type;
                const isExpanded = expandedId === h.id;

                return (
                  <>
                    <tr
                      key={h.id}
                      onClick={() => hasFigi && setExpandedId(isExpanded ? null : h.id)}
                      className={`border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors ${
                        hasFigi ? "cursor-pointer" : ""
                      }`}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-1.5">
                          {h.name}
                          {hasFigi && (
                            <svg
                              className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] font-mono">{h.ticker ?? "—"}</td>
                      <td className="px-6 py-3 text-sm text-[var(--text-secondary)] capitalize">{h.asset_type ?? "—"}</td>
                      <td className="px-6 py-3 text-sm">
                        <SourceBadge type={h.source_type} />
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-primary)] text-right tabular-nums">
                        {h.quantity != null ? h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--text-primary)] text-right font-medium tabular-nums">
                        {h.value_usd != null ? format(h.value_usd) : "—"}
                      </td>
                    </tr>
                    {isExpanded && hasFigi && (
                      <tr key={`${h.id}-figi`} className="border-b border-[var(--border-color)]/50">
                        <td colSpan={6} className="px-6 py-3 bg-[var(--bg-tertiary)]/30">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <FigiDetail label="FIGI" value={h.figi} />
                            <FigiDetail label="Composite FIGI" value={h.composite_figi} />
                            <FigiDetail label="Share Class FIGI" value={h.share_class_figi} />
                            <FigiDetail label="Security Type" value={h.security_type} />
                            <FigiDetail label="Market Sector" value={h.market_sector} />
                            <FigiDetail label="Exchange" value={h.exch_code} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
