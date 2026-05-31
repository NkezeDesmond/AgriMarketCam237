/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }) as any]
  })
);

registerRoute(
  ({ request }) => request.destination === "document",
  new NetworkFirst({
    cacheName: "documents"
  })
);

registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: "assets"
  })
);

const navigationHandler = createHandlerBoundToURL("/index.html");
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/docs\//] }));

self.addEventListener("push", (event: PushEvent) => {
  const raw = event.data?.text() ?? "";
  const parsed = (() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const title = typeof parsed?.title === "string" ? parsed.title : "AgriMarket Cameroon";
  const body = typeof parsed?.body === "string" ? parsed.body : "You have a new notification.";
  const url = typeof parsed?.url === "string" ? parsed.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as any)?.url ?? "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of allClients) {
        if ("focus" in c) {
          (c as WindowClient).navigate(url);
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
