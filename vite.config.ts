import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "offline.html"],
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      manifest: {
        name: "AgriMarket Cameroon",
        short_name: "AgriMarket",
        description: "Offline-first agricultural marketplace for Cameroon.",
        theme_color: "#1B7F3B",
        background_color: "#0b1220",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: true
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**"]
  }
});
