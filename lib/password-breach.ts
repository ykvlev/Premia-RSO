import { createHash } from "node:crypto";

/**
 * Проверка пароля по базе утёкших паролей (HIBP — Have I Been Pwned).
 * Использует k-anonymity модель: отправляем только первые 5 символов SHA-1 хеша,
 * полный хеш никогда не покидает клиент.
 *
 * Ссылка: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

/** Проверяет, был ли пароль утёк. Возвращает количество компрометаций (0 = безопасно). */
export async function checkPasswordBreach(password: string): Promise<number> {
  try {
    const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: { AddPadding: "false" },
        // Кэшируем на 1 час чтобы не долбить API
        next: { revalidate: 3600 },
      },
    );

    if (!res.ok) {
      // API недоступен — не блокируем регистрацию
      console.error("[hibp] API error:", res.status);
      return 0;
    }

    const text = await res.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix?.trim() === suffix) {
        return parseInt(count.trim(), 10) || 0;
      }
    }

    return 0;
  } catch (err) {
    console.error("[hibp] Check failed:", err);
    // Сеть недоступна — не блокируем
    return 0;
  }
}

/** Проверяет и возвращает человекочитаемое сообщение. */
export async function getPasswordBreachWarning(password: string): Promise<string | null> {
  const count = await checkPasswordBreach(password);
  if (count === 0) return null;
  return `Этот пароль был обнаружен в ${count.toLocaleString("ru-RU")} утечках данных. Выберите другой пароль.`;
}
