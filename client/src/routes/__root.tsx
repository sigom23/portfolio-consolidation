import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { Sidebar } from "../components/Sidebar";

function RootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  // No sidebar for unauthenticated pages
  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:ml-[220px] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
