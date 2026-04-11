import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useHoldings } from "../hooks/usePortfolio";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../contexts/CurrencyContext";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { deleteAccount, exportUserData, clearAllHoldings } from "../services/api";

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: holdings } = useHoldings();
  const { theme, toggle: toggleTheme } = useTheme();
  const { baseCurrency, setBaseCurrency, currencies } = useCurrency();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleExport = () => {
    exportUserData();
  };

  const handleClearHoldings = async () => {
    const count = holdings?.length ?? 0;
    if (!confirm(`This will delete all ${count} holding(s). Your uploads and wallets will be kept. Continue?`)) return;

    setClearing(true);
    try {
      const result = await clearAllHoldings();
      setClearResult(result.deleted);
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "summary"] });
      queryClient.invalidateQueries({ queryKey: ["holdings", "sector-allocation"] });
      queryClient.invalidateQueries({ queryKey: ["holdings", "geography-allocation"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clear holdings");
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? All data will be permanently removed.")) return;
    const typed = prompt('Type DELETE to confirm account deletion:');
    if (typed !== "DELETE") {
      if (typed !== null) alert("Account deletion cancelled — you must type DELETE exactly.");
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Account deletion failed");
      setDeleting(false);
    }
  };

  return (
    <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account and data</p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Account</h2>
        <div className="space-y-1 text-sm">
          <p className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Name:</span> {user.name ?? "—"}
          </p>
          <p className="text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Email:</span> {user.email ?? "—"}
          </p>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Preferences</h2>

        {/* Base currency */}
        <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-color)]/50">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Base Currency</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              All amounts across the app are displayed in this currency. Native currencies are converted using live FX rates.
            </p>
          </div>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="shrink-0 w-48 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Toggle between light and dark mode. Dark is the recommended private-banking experience.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm font-medium text-[var(--text-primary)] hover:border-blue-500/40 transition-colors"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>

      {/* Privacy & Data */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Privacy & Data</h2>

        {/* Export */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export My Data</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Download all your portfolio data as a JSON file. Original uploaded files can be downloaded separately from the Uploads page.
              </p>
            </div>
            <button
              onClick={handleExport}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Download
            </button>
          </div>
        </div>

        {/* Clear holdings */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Clear All Holdings</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Remove all {holdings?.length ?? 0} holding(s) while keeping your account, uploads, and wallets. You can re-parse uploads afterwards.
              </p>
            </div>
            <button
              onClick={handleClearHoldings}
              disabled={clearing || (holdings?.length ?? 0) === 0}
              className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {clearing ? "Clearing..." : "Clear"}
            </button>
          </div>
          {clearResult !== null && (
            <p className="text-xs text-green-500 mt-2">Cleared {clearResult} holding(s)</p>
          )}
        </div>

        {/* Delete account */}
        <div className="rounded-xl border border-red-500/30 bg-[var(--bg-secondary)] p-6 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-red-500">Delete My Account</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Permanently delete your account and all associated data including holdings, uploads, and wallets. This cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
