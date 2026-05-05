import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

function IndexPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).has("preview");
    if (!loading && user && !preview) {
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
    <div className="welcome-bg flex flex-col items-center justify-center min-h-screen gap-10 px-6">
      <div className="text-center max-w-2xl">
        <p className="text-[10.4px] font-medium uppercase tracking-[0.32em] text-[var(--color-mid)] mb-6">
          Wealth Intelligence Platform
        </p>
        <h1 className="font-serif text-[clamp(40px,6vw,64px)] font-normal leading-[1.05] tracking-[-0.035em] text-[var(--color-charcoal)]">
          Your financial life,<br />considered.
        </h1>
        <p className="text-[14.5px] font-light text-[var(--color-mid)] max-w-md mx-auto mt-6 leading-relaxed">
          Cash, equity, real estate, and crypto — consolidated into one calm,
          considered view.
        </p>
      </div>
      <button
        onClick={login}
        className="px-9 py-3.5 bg-[var(--color-charcoal)] text-white rounded-full text-[14px] font-medium hover:bg-[var(--color-dark)] transition-colors"
      >
        Get Started
      </button>
      <p className="text-[10.4px] font-medium uppercase tracking-[0.32em] text-[var(--color-light)]">
        Private &nbsp;·&nbsp; Local &nbsp;·&nbsp; Considered
      </p>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
