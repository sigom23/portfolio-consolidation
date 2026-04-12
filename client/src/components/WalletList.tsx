import { useState } from "react";
import type { Wallet } from "../types";
import { useAddWallet, useDeleteWallet, useRefreshWallet } from "../hooks/usePortfolio";

interface Props {
  wallets: Wallet[];
  loading: boolean;
  showAddForm?: boolean;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletList({ wallets, loading, showAddForm = true }: Props) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const addMutation = useAddWallet();
  const deleteMutation = useDeleteWallet();
  const refreshMutation = useRefreshWallet();

  const handleAdd = () => {
    if (!address.trim()) return;
    addMutation.mutate(
      { address: address.trim(), label: label.trim() || undefined },
      {
        onSuccess: () => {
          setAddress("");
          setLabel("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Wallet Form */}
      {showAddForm && (
        <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-colors">
          <h2 className="text-[18px] font-normal text-[var(--text-primary)] mb-4">Add Wallet</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="sm:w-48 px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={handleAdd}
              disabled={!address.trim() || addMutation.isPending}
              className="px-4 py-2 bg-[var(--color-charcoal)] text-white rounded-full font-medium hover:bg-[var(--color-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {addMutation.isPending ? "Adding..." : "Add Wallet"}
            </button>
          </div>
          {addMutation.isError && (
            <p className="mt-2 text-sm text-[var(--color-negative)]">{addMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Wallet List */}
      <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-[18px] font-normal text-[var(--text-primary)]">Your Wallets</h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-[var(--text-muted)]">Loading wallets...</div>
        ) : wallets.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--text-muted)]">
            No wallets added yet. Add an Ethereum address above to track your holdings.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]/50">
            {wallets.map((w) => (
              <div key={w.id} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-[var(--text-primary)]">{truncateAddress(w.address)}</span>
                    {w.label && (
                      <span className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-2 py-0.5 rounded">{w.label}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">{w.chain}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Added {new Date(w.added_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshMutation.mutate(w.id)}
                    disabled={refreshMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-[var(--color-positive)]/10 text-[var(--color-positive)] rounded-[2px] hover:bg-[var(--color-positive)]/20 disabled:opacity-50 transition-colors"
                  >
                    {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(w.id)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-xs text-[var(--color-negative)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
