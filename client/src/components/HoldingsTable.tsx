import { useState } from "react";
import type { Holding } from "../types";

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

const SPAM_THRESHOLD = 1; // $1

export function HoldingsTable({ holdings, loading }: Props) {
  const [hideSpam, setHideSpam] = useState(true);

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
              <th className="px-6 py-3 font-medium text-right">Value (USD)</th>
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
              filtered.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <td className="px-6 py-3 text-sm font-medium text-[var(--text-primary)]">{h.name}</td>
                  <td className="px-6 py-3 text-sm text-[var(--text-secondary)] font-mono">{h.ticker ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-[var(--text-secondary)] capitalize">{h.asset_type ?? "—"}</td>
                  <td className="px-6 py-3 text-sm">
                    <SourceBadge type={h.source_type} />
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--text-primary)] text-right tabular-nums">
                    {h.quantity != null ? h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-[var(--text-primary)] text-right font-medium tabular-nums">
                    {h.value_usd != null
                      ? `$${h.value_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
