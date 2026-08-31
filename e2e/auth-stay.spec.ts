import { test, expect } from "@playwright/test";

/**
 * Регрессия: участника выбрасывало из кабинета на лендинг через пару секунд
 * после загрузки — колокольчик уведомлений дёргал getUnreadCount(), а тот
 * звал requireRole() без ролей, что редиректило ЛЮБОГО пользователя на "/".
 * Тест логинится dev-участником (работает без БД, когда недоступна локальная)
 * и проверяет, что через 8 секунд мы всё ещё в /cabinet.
 */
test("participant stays in cabinet after login (no bounce to landing)", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "participant@test.ru");
  await page.fill('input[type="password"]', "TrudKrut2026!");
  await page.click('button[type="submit"]');

  // Если dev-юзеров нет (например, запущена локальная БД без сида) — пропускаем.
  const err = page.locator("text=Неверный email или пароль");
  try {
    await err.waitFor({ timeout: 4000 });
    test.skip(true, "dev-пользователи недоступны (есть БД без сида)");
  } catch {
    /* ошибки логина нет — продолжаем */
  }

  await page.waitForURL("**/cabinet", { timeout: 30000 });

  // Баг проявлялся через пару секунд после гидрации.
  await page.waitForTimeout(8000);

  expect(page.url()).toContain("/cabinet");
  expect(page.url()).not.toMatch(/\/$|\?/);
});
