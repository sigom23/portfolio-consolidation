import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";

function RootLayout() {
  const { user, loading, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Portfolio
          </Link>
          {user && (
            <>
              <Link
                to="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
                activeProps={{ className: "text-sm text-blue-600 font-medium" }}
              >
                Dashboard
              </Link>
              <Link
                to="/upload"
                className="text-sm text-gray-600 hover:text-gray-900"
                activeProps={{ className: "text-sm text-blue-600 font-medium" }}
              >
                Upload
              </Link>
              <Link
                to="/wallets"
                className="text-sm text-gray-600 hover:text-gray-900"
                activeProps={{ className: "text-sm text-blue-600 font-medium" }}
              >
                Wallets
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : user ? (
            <>
              <span className="text-sm text-gray-600">{user.name ?? user.email}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
