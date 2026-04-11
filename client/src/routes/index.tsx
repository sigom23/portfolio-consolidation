import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

function IndexPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/my-wealth" });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
      <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">Portfolio Consolidation</h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-md mt-3">
          Track all your assets in one place — stocks, crypto, bonds, and more.
        </p>
      </div>
      <button
        onClick={login}
        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-lg"
      >
        Login to Get Started
      </button>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
