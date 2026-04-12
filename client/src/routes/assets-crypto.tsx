import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings, useWallets } from "../hooks/usePortfolio";
import { useCurrency } from "../contexts/CurrencyContext";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { useAddWallet, useDeleteWallet, useRefreshWallet } from "../hooks/usePortfolio";


function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type WalletGroup = {
  wallet: Wallet | null; // null = unassigned / unknown wallet
  sourceId: string | null;
  holdings: Holding[];
  totalUsd: number;
};

const SPAM_THRESHOLD = 1; // $1

function AssetsCryptoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: holdings, isLoading: holdingsLoading } = useHoldings();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const { format, baseCurrency, flag } = useCurrency();
  const [hideSpam, setHideSpam] = useState(true);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletLabel, setWalletLabel] = useState("");
  const addWallet = useAddWallet();
  const deleteWallet = useDeleteWallet();
  const refreshWallet = useRefreshWallet();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  const cryptoHoldings = useMemo(
    () => (holdings ?? []).filter((h) => h.asset_type === "crypto"),
    [holdings]
  );

  const spamCount = useMemo(
    () => cryptoHoldings.filter((h) => (h.value_usd ?? 0) < SPAM_THRESHOLD).length,
    [cryptoHoldings]
  );

  const visibleHoldings = useMemo(
    () => hideSpam ? cryptoHoldings.filter((h) => (h.value_usd ?? 0) >= SPAM_THRESHOLD) : cryptoHoldings,
    [cryptoHoldings, hideSpam]
  );

  const totalUsd = useMemo(
    () => cryptoHoldings.reduce((sum, h) => sum + (h.value_usd ?? 0), 0),
    [cryptoHoldings]
  );

  // Group holdings by wallet (source_id). Holdings without a matching wallet
  // fall into a null bucket so nothing silently disappears.
  const groups = useMemo<WalletGroup[]>(() => {
    const byId = new Map<string, WalletGroup>();
    const unassigned: WalletGroup = {
      wallet: null,
      sourceId: null,
      holdings: [],
      totalUsd: 0,
    };

    for (const h of visibleHoldings) {
      const sourceId = h.source_id;
      if (!sourceId) {
        unassigned.holdings.push(h);
        unassigned.totalUsd += h.value_usd ?? 0;
        continue;
      }
      let group = byId.get(sourceId);
      if (!group) {
        const wallet = (wallets ?? []).find((w) => String(w.id) === sourceId) ?? null;
        group = { wallet, sourceId, holdings: [], totalUsd: 0 };
        byId.set(sourceId, group);
      }
      group.holdings.push(h);
      group.totalUsd += h.value_usd ?? 0;
    }

    const result = Array.from(byId.values()).sort((a, b) => b.totalUsd - a.totalUsd);
    if (unassigned.holdings.length > 0) result.push(unassigned);
    for (const g of result) {
      g.holdings.sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0));
    }
    return result;
  }, [visibleHoldings, wallets]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  const loading = holdingsLoading || walletsLoading;

  return (
    <div className="px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[27px] font-serif font-normal tracking-[-0.03em] text-[var(--text-primary)]">Crypto</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Tokens held across your tracked wallets
          </p>
        </div>
        <button
          onClick={() => setShowAddWallet(!showAddWallet)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--color-charcoal)] text-white rounded-full text-sm font-medium hover:bg-[var(--color-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Wallet
        </button>
      </div>

      {/* Inline add wallet form */}
      {showAddWallet && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
              className="sm:w-48 px-3 py-2 border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[2px] text-sm focus:outline-none focus:border-[var(--color-charcoal)] placeholder:text-[var(--text-muted)]"
            />
            <button
              onClick={() => {
                if (!walletAddress.trim()) return;
                addWallet.mutate(
                  { address: walletAddress.trim(), label: walletLabel.trim() || undefined },
                  { onSuccess: () => { setWalletAddress(""); setWalletLabel(""); setShowAddWallet(false); } }
                );
              }}
              disabled={!walletAddress.trim() || addWallet.isPending}
              className="px-4 py-2 bg-[var(--color-charcoal)] text-white rounded-full text-sm font-medium hover:bg-[var(--color-dark)] disabled:opacity-50 transition-colors"
            >
              {addWallet.isPending ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => setShowAddWallet(false)}
              className="px-3 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-[2px] text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
          </div>
          {addWallet.isError && (
            <p className="mt-2 text-xs text-[var(--color-negative)]">{addWallet.error.message}</p>
          )}
        </motion.div>
      )}

      {/* Total value hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] as const }}
        className="rounded-[2px] border border-[var(--color-whisper)] bg-white p-6 mb-6 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10.4px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)] mb-1">
            Crypto Value
          </p>
          <span className="text-xs text-[var(--text-muted)]">{flag} {baseCurrency}</span>
        </div>
        {loading ? (
          <div className="h-10 w-56 bg-[var(--bg-tertiary)] rounded animate-pulse" />
        ) : (
          <p className="text-[38px] font-serif font-light tracking-[-0.03em] text-[var(--text-primary)] tabular-nums tracking-tight">
            <AnimatedNumber value={totalUsd} format={format} />
          </p>
        )}
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {visibleHoldings.length} token{visibleHoldings.length === 1 ? "" : "s"} across{" "}
          {groups.length} wallet{groups.length === 1 ? "" : "s"}
          {hideSpam && spamCount > 0 && (
            <span className="text-[var(--text-muted)]"> · {spamCount} low-value hidden</span>
          )}
        </p>
      </motion.div>

      {/* Wallet groups */}
      {loading ? (
        <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-muted)]">
          Loading crypto holdings...
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center text-[var(--text-muted)]">
          No crypto holdings yet. Click "Add Wallet" above to start tracking tokens.
        </div>
      ) : (
        <div className="space-y-6">
          {spamCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setHideSpam(!hideSpam)}
                className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    hideSpam ? "bg-[var(--color-charcoal)]" : "bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      hideSpam ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
                Hide low-value tokens ({spamCount})
              </button>
            </div>
          )}
          {groups.map((group, i) => (
            <motion.section
              key={group.sourceId ?? "unassigned"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.25, 1, 0.5, 1] as const }}
              className="rounded-[2px] border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {group.wallet?.label ?? (group.wallet ? truncateAddress(group.wallet.address) : "Unassigned")}
                  </h2>
                  {group.wallet && (
                    <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                      {truncateAddress(group.wallet.address)} · {group.wallet.chain}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                    {format(group.totalUsd)}
                  </p>
                  {group.wallet && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => refreshWallet.mutate(group.wallet!.id)}
                        disabled={refreshWallet.isPending}
                        className="px-2 py-1 text-[10px] bg-[var(--color-positive)]/10 text-[var(--color-positive)] rounded hover:bg-[var(--color-positive)]/20 disabled:opacity-50 transition-colors"
                        title="Refresh"
                      >
                        {refreshWallet.isPending ? "..." : "Refresh"}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete wallet ${truncateAddress(group.wallet!.address)}?`)) deleteWallet.mutate(group.wallet!.id); }}
                        className="px-2 py-1 text-[10px] text-[var(--color-negative)] hover:text-[var(--color-negative)] transition-colors"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[var(--border-color)]/50">
                {group.holdings.map((h) => (
                  <div
                    key={h.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{h.name}</p>
                      {h.ticker && (
                        <p className="text-xs text-[var(--text-muted)] uppercase">{h.ticker}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                        {format(h.value_usd ?? 0)}
                      </p>
                      {h.quantity != null && (
                        <p className="text-xs text-[var(--text-muted)] tabular-nums">
                          {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} {h.ticker ?? ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/assets/crypto",
  component: AssetsCryptoPage,
});
