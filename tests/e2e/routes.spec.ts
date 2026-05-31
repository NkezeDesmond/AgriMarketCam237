import { test, expect } from "@playwright/test";

test("public routes load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("AgriMarket")).toBeVisible();

  await page.goto("/marketplace");
  await expect(page.getByText("Search")).toBeVisible();

  await page.goto("/prices");
  await expect(page.getByText("Market price trend")).toBeVisible();

  await page.goto("/info");
  await expect(page.getByText("About")).toBeVisible();
});

test("protected routes redirect to auth", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/auth\?redirect=%2Forders/);

  await page.goto("/chat");
  await expect(page).toHaveURL(/\/auth\?redirect=%2Fchat/);

  await page.goto("/advisory");
  await expect(page).toHaveURL(/\/auth\?redirect=%2Fadvisory/);

  await page.goto("/sync");
  await expect(page).toHaveURL(/\/auth\?redirect=%2Fsync/);
});

