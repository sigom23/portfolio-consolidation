import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";

type NavItem = {
  to: string;
  label: string;
};

const MY_WEALTH_CHILDREN: NavItem[] = [
  { to: "/assets/liquid", label: "Liquid" },
  { to: "/assets/illiquid", label: "Illiquid" },
  { to: "/assets/real-estate", label: "Real Estate" },
  { to: "/assets/crypto", label: "Crypto" },
];

const CASHFLOW_CHILDREN: NavItem[] = [
  { to: "/cashflow/income", label: "Income" },
  { to: "/cashflow/expenses", label: "Expenses" },
];

const TRAILING_ITEMS: NavItem[] = [
  { to: "/data-room", label: "Data Room" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const linkBase =
    "block px-4 py-2 text-[12.5px] font-normal text-[var(--color-mid)] hover:bg-[var(--color-snow)] transition-colors duration-200";
  const linkActive =
    "block px-4 py-2 text-[12.5px] font-semibold text-[var(--color-charcoal)] bg-[var(--color-snow)]";

  const linkClass = (to: string) => (pathname === to ? linkActive : linkBase);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-[2px] bg-white border border-[var(--color-whisper)] text-[var(--color-charcoal)]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[220px] bg-white border-r border-[var(--color-whisper)] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Wordmark */}
        <div className="px-6 py-6 border-b border-[var(--color-whisper)]">
          <Link to="/my-wealth" className="block" onClick={() => setMobileOpen(false)}>
            <span className="font-serif text-[22px] font-medium text-[var(--color-charcoal)]">Wealth</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* My Wealth group */}
          <Link
            to="/my-wealth"
            onClick={() => setMobileOpen(false)}
            className={linkClass("/my-wealth")}
          >
            My Wealth
          </Link>
          <div className="pl-4 space-y-0.5">
            {MY_WEALTH_CHILDREN.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={linkClass(item.to)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Cash Flow group */}
          <div className="pt-3 space-y-0.5">
            <Link
              to="/cashflow"
              onClick={() => setMobileOpen(false)}
              className={linkClass("/cashflow")}
            >
              Cash Flow
            </Link>
            <div className="pl-4 space-y-0.5">
              {CASHFLOW_CHILDREN.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={linkClass(item.to)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Trailing items */}
          <div className="pt-3 space-y-0.5">
            {TRAILING_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={linkClass(item.to)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-[var(--color-whisper)] space-y-2">
          {user && (
            <div className="px-0 py-1">
              <p className="text-[12.5px] font-medium text-[var(--color-charcoal)] truncate">{user.name ?? user.email}</p>
              {user.name && user.email && (
                <p className="text-[10.4px] text-[var(--color-muted)] truncate">{user.email}</p>
              )}
            </div>
          )}

          {user && (
            <button
              onClick={logout}
              className="block w-full text-left px-0 py-1.5 text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-charcoal)] transition-colors duration-200"
            >
              Logout
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
