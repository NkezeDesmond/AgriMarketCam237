import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  retries: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"], channel: "chrome" } }
  ],
  webServer: {
    command: `npm.cmd run dev -- --host 0.0.0.0 --port ${process.env.PLAYWRIGHT_PORT ?? "5173"}`,
    port: Number(process.env.PLAYWRIGHT_PORT ?? "5173"),
    reuseExistingServer: true
  }
});
