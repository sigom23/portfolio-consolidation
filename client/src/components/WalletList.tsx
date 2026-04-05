import { useState } from "react";
import type { Wallet } from "../types";
import { useAddWallet, useDeleteWallet, useRefreshWallet } from "../hooks/usePortfolio";

interface Props {
  wallets: Wallet[];
  loading: boolean;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletList({ wallets, loading }: Props) {
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Wallet</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!address.trim() || addMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {addMutation.isPending ? "Adding..." : "Add Wallet"}
          </button>
        </div>
        {addMutation.isError && (
          <p className="mt-2 text-sm text-red-600">{addMutation.error.message}</p>
        )}
      </div>

      {/* Wallet List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Wallets</h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-400">Loading wallets...</div>
        ) : wallets.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">
            No wallets added yet. Add an Ethereum address above to track your holdings.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {wallets.map((w) => (
              <div key={w.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-900">{truncateAddress(w.address)}</span>
                    {w.label && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{w.label}</span>
                    )}
                    <span className="text-xs text-gray-400">{w.chain}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Added {new Date(w.added_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshMutation.mutate(w.id)}
                    disabled={refreshMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                  >
                    {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(w.id)}
                    disabled={deleteMutation.isPending}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 transition-colors"
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
