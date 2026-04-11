import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, createRoute, redirect, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import "./styles/index.css";

import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as myWealthRoute } from "./routes/my-wealth";
import { Route as assetsLiquidRoute } from "./routes/assets-liquid";
import { Route as assetsIlliquidRoute } from "./routes/assets-illiquid";
import { Route as assetsRealEstateRoute } from "./routes/assets-real-estate";
import { Route as assetsCryptoRoute } from "./routes/assets-crypto";
import { Route as cashflowRoute } from "./routes/cashflow";
import { Route as cashflowIncomeRoute } from "./routes/cashflow-income";
import { Route as cashflowExpensesRoute } from "./routes/cashflow-expenses";
import { Route as dataRoomRoute } from "./routes/data-room";
import { Route as settingsRoute } from "./routes/settings";

// Legacy path redirects (old URLs still arriving from bookmarks / links)
const dashboardRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    throw redirect({ to: "/my-wealth" });
  },
  component: () => null,
});

const uploadRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: "/upload",
  beforeLoad: () => {
    throw redirect({ to: "/data-room" });
  },
  component: () => null,
});

const walletsRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wallets",
  beforeLoad: () => {
    throw redirect({ to: "/data-room" });
  },
  component: () => null,
});

const realEstateRedirect = createRoute({
  getParentRoute: () => rootRoute,
  path: "/real-estate",
  beforeLoad: () => {
    throw redirect({ to: "/assets/real-estate" });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  myWealthRoute,
  assetsLiquidRoute,
  assetsIlliquidRoute,
  assetsRealEstateRoute,
  assetsCryptoRoute,
  cashflowRoute,
  cashflowIncomeRoute,
  cashflowExpensesRoute,
  dataRoomRoute,
  settingsRoute,
  dashboardRedirect,
  uploadRedirect,
  walletsRedirect,
  realEstateRedirect,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <RouterProvider router={router} />
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
