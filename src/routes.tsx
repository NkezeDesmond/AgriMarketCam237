import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { CreateListingPage } from "./pages/CreateListingPage";
import { CartPage } from "./pages/CartPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ChatPage } from "./pages/ChatPage";
import { MarketPricesPage } from "./pages/MarketPricesPage";
import { AdvisoryChatPage } from "./pages/AdvisoryChatPage";
import { OfflineSyncPage } from "./pages/OfflineSyncPage";
import { AccountHubPage } from "./pages/AccountHubPage";
import { InfoPage } from "./pages/InfoPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSetupPage } from "./pages/AdminSetupPage";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { useAuthStore } from "./store/authStore";
import type { UserRole } from "./types/database";

function RequireAuth({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!initialized) return null;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function RequireOnboarded({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const profile = useAuthStore((s) => s.profile);
  const location = useLocation();
  if (!initialized) return null;
  if (!profile) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(next)}`} replace />;
  }
  if (!profile.onboarded) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const profile = useAuthStore((s) => s.profile);
  const location = useLocation();
  if (!initialized) return null;
  if (!profile) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(next)}`} replace />;
  }
  if (profile.role !== role) return <Navigate to="/marketplace" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      { path: "info", element: <InfoPage /> },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <DashboardPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "onboarding",
        element: (
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        )
      },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "listings/:id", element: <ListingDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "prices", element: <MarketPricesPage /> },
      {
        path: "listings/new",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole role="farmer">
                <CreateListingPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "orders",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <OrdersPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "chat",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <ChatPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "advisory",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <AdvisoryChatPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "sync",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <OfflineSyncPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "account",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <AccountHubPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "notifications",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <NotificationsPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "admin-setup",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <AdminSetupPage />
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      {
        path: "admin",
        element: (
          <RequireAuth>
            <RequireOnboarded>
              <RequireRole role="admin">
                <AdminDashboardPage />
              </RequireRole>
            </RequireOnboarded>
          </RequireAuth>
        )
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
