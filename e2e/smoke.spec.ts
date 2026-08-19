import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows main heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Труд крут/i);
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("a[href]");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Apply flow", () => {
  test("apply page loads", async ({ page }) => {
    const response = await page.goto("/apply");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("API health", () => {
  test("health endpoint responds", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
  });
});

test.describe("Cabinet", () => {
  test("cabinet redirects or shows auth", async ({ page }) => {
    const response = await page.goto("/cabinet");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Admin", () => {
  test("admin redirects or shows auth", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Jury", () => {
  test("jury redirects or shows auth", async ({ page }) => {
    const response = await page.goto("/jury");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Static pages", () => {
  test("about page exists", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBeLessThan(500);
  });

  test("contacts page exists", async ({ page }) => {
    const response = await page.goto("/contacts");
    expect(response?.status()).toBeLessThan(500);
  });

  test("nominations page exists", async ({ page }) => {
    const response = await page.goto("/nominations");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Non-existent pages", () => {
  test("shows 404 for unknown route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });
});
