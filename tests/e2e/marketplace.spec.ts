import { test, expect } from "@playwright/test";

test("marketplace loads", async ({ page }) => {
  await page.goto("/marketplace");
  await expect(page.getByText("Search")).toBeVisible();
});

