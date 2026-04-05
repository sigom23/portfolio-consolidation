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
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet Management</h1>
      <WalletList wallets={wallets ?? []} loading={isLoading} />
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  component: WalletsPage,
});
