import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { Sidebar } from "../components/Sidebar";

function RootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
      <main className="lg:ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
