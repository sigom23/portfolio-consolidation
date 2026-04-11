import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../contexts/CurrencyContext";
import { useState, type ComponentType } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType;
};

// My Wealth is a real page AND a parent — its children are the 4 asset surfaces.
// Same pattern for Cash Flow: the parent link is the overview, children drill down.
const MY_WEALTH_CHILDREN: NavItem[] = [
  { to: "/assets/liquid", label: "Liquid", icon: LiquidIcon },
  { to: "/assets/illiquid", label: "Illiquid", icon: IlliquidIcon },
  { to: "/assets/real-estate", label: "Real Estate", icon: RealEstateIcon },
  { to: "/assets/crypto", label: "Crypto", icon: CryptoIcon },
];

const CASHFLOW_CHILDREN: NavItem[] = [
  { to: "/cashflow/income", label: "Income", icon: IncomeIcon },
  { to: "/cashflow/expenses", label: "Expenses", icon: ExpensesIcon },
];

const TRAILING_ITEMS: NavItem[] = [
  { to: "/data-room", label: "Data Room", icon: DataRoomIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { baseCurrency, setBaseCurrency, currencies } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // My Wealth parent highlights when on /my-wealth OR any /assets/* child.
  // Same for Cash Flow: parent highlights on /cashflow OR any /cashflow/* child.
  const myWealthActive =
    pathname === "/my-wealth" || pathname.startsWith("/assets/");
  const cashflowActive = pathname.startsWith("/cashflow");

  const linkBase =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white transition-colors";
  const linkActive =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[var(--sidebar-bg)] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <Link to="/my-wealth" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">Wealth</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* My Wealth group — parent link + asset children */}
          <Link
            to="/my-wealth"
            onClick={() => setMobileOpen(false)}
            className={myWealthActive ? linkActive : linkBase}
          >
            <MyWealthIcon />
            My Wealth
          </Link>
          <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
            {MY_WEALTH_CHILDREN.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={linkBase}
                activeProps={{ className: linkActive }}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Cash Flow group — parent link + income/expenses children */}
          <div className="pt-2">
            <Link
              to="/cashflow"
              onClick={() => setMobileOpen(false)}
              className={pathname === "/cashflow" || cashflowActive ? linkActive : linkBase}
              // Override: don't let TanStack's activeProps fire on child routes,
              // we handle parent-active manually above via `cashflowActive`.
              activeOptions={{ exact: true }}
            >
              <CashFlowIcon />
              Cash Flow
            </Link>
            <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
              {CASHFLOW_CHILDREN.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={linkBase}
                  activeProps={{ className: linkActive }}
                >
                  <item.icon />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-1">
            {TRAILING_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={linkBase}
                activeProps={{ className: linkActive }}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          {/* Currency selector */}
          {currencies.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--sidebar-text)] mb-1.5">Base Currency</p>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white/10 text-white text-sm border-0 outline-none cursor-pointer"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code} className="bg-[var(--sidebar-bg)] text-white">
                    {c.flag} {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white transition-colors"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {/* User info */}
          {user && (
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white truncate">{user.name ?? user.email}</p>
              {user.name && user.email && (
                <p className="text-xs text-[var(--sidebar-text)] truncate">{user.email}</p>
              )}
            </div>
          )}

          {/* Logout */}
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogoutIcon />
              Logout
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

// Icon components
function MyWealthIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function IncomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14" />
    </svg>
  );
}

function LiquidIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function IlliquidIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  );
}

function RealEstateIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function CryptoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 8.25h4.125a2.25 2.25 0 010 4.5H9.75m0 0h4.5a2.25 2.25 0 010 4.5H9.75m0-9v9m0-9V6.75m0 10.5v1.5" />
    </svg>
  );
}

function CashFlowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function DataRoomIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
