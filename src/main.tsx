import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { router } from "./routes";
import "./index.css";
import "./lib/i18n";
import { useAuthStore } from "./store/authStore";
import { syncQueuedActions } from "./lib/offline/sync";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "./components/ui/button";

function PwaUpdater() {
  if (!import.meta.env.PROD) return null;
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true
  });

  if (!needRefresh[0]) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="text-sm">
          Update available. Refresh to get the latest version.
        </div>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          Refresh
        </Button>
      </div>
    </div>
  );
}

function Root() {
  const init = useAuthStore((s) => s.init);

  React.useEffect(() => {
    if (!import.meta.env.PROD && "serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())));
    }
    void init();
    void syncQueuedActions();

    const onOnline = () => {
      void syncQueuedActions();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <PwaUpdater />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
