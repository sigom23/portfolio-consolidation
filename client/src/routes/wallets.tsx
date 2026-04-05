import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

function WalletsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Wallet Management</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-lg">Coming soon — Phase 3</p>
        <p className="text-gray-400 mt-2 text-sm">
          Connect Ethereum wallets to automatically track crypto holdings.
        </p>
      </div>
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  component: WalletsPage,
});
