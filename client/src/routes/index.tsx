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
        <div className="w-8 h-8 border-2 border-[var(--color-light)] border-t-[var(--color-charcoal)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-12 px-6">
      <div className="text-center">
        <h1 className="font-serif text-[38px] font-light tracking-[-0.03em] text-[var(--color-charcoal)]">Wealth</h1>
        <p className="text-[15.7px] font-light text-[var(--color-mid)] max-w-md mt-4 leading-relaxed">
          One intelligent view of your financial life.
        </p>
      </div>
      <button
        onClick={login}
        className="px-8 py-3.5 border border-[var(--color-faint)] text-[var(--color-mid)] rounded-full text-[14px] font-medium hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
