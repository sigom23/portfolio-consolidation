import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuth } from "../hooks/useAuth";
import { useWallets } from "../hooks/usePortfolio";
import { useEffect } from "react";
import { WalletList } from "../components/WalletList";

function WalletsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: wallets, isLoading } = useWallets();

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

  return (
    <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Wallet Management</h1>
      <WalletList wallets={wallets ?? []} loading={isLoading} />
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  component: WalletsPage,
});
