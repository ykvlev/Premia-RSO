import { test, expect } from "@playwright/test";

test.describe("Cookie consent", () => {
  test("cookie consent banner appears on first visit", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("text=Cookie").or(page.locator("text=cookie")).or(page.locator("text=Принимаю")).or(page.locator("text=Согласен"));
    await expect(banner.first()).toBeVisible({ timeout: 10000 });
  });

  test("can dismiss cookie consent", async ({ page }) => {
    await page.goto("/");
    const acceptBtn = page.locator("button:has-text('Принимаю')").or(page.locator("button:has-text('Согласен')")).or(page.locator("button:has-text('OK')"));
    if (await acceptBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptBtn.first().click();
      await expect(acceptBtn.first()).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("Responsive design", () => {
  test("landing works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("landing works on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("landing works on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Accessibility basics", () => {
  test("page has lang attribute", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "ru");
  });

  test("no console errors on landing", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const criticalErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("404"));
    expect(criticalErrors).toHaveLength(0);
  });
});
