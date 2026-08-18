/**
 * Политика почты: заявки принимаются только с российских или корпоративных
 * адресов. Блокируем известные зарубежные (личные) почтовые сервисы —
 * Gmail, Outlook, Yahoo и т.п. Корпоративные домены (любой свой домен) и
 * российские сервисы (mail.ru, yandex и др.) проходят.
 *
 * Используется и на клиенте (мгновенная подсказка), и на сервере (защита).
 */

const BLOCKED_DOMAINS = new Set<string>([
  // Google
  "gmail.com", "googlemail.com",
  // Microsoft
  "outlook.com", "outlook.fr", "outlook.de", "hotmail.com", "hotmail.co.uk",
  "hotmail.fr", "live.com", "live.co.uk", "msn.com", "windowslive.com",
  // Yahoo
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.de", "ymail.com", "rocketmail.com",
  // Apple
  "icloud.com", "me.com", "mac.com",
  // AOL / Verizon
  "aol.com", "aim.com",
  // Proton
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  // GMX / Mail.com family
  "gmx.com", "gmx.net", "gmx.de", "gmx.us", "gmx.co.uk",
  "mail.com", "email.com", "usa.com", "consultant.com",
  // Zoho
  "zoho.com", "zohomail.com", "zoho.eu",
  // Tutanota / Tuta
  "tutanota.com", "tutanota.de", "tuta.io", "tuta.com", "tutamail.com",
  // Прочие зарубежные
  "fastmail.com", "fastmail.fm", "hey.com", "hushmail.com", "cock.li",
  "yandex.com", // международный интерфейс не нужен — есть yandex.ru
  "126.com", "163.com", "qq.com", "sina.com", "naver.com", "daum.net",
]);

export type EmailCheck = { ok: boolean; reason?: string };

const REASON =
  "Заявки принимаются только с российских или корпоративных почт. " +
  "Зарубежные сервисы (Gmail, Outlook, Yahoo и т.п.) не подходят — " +
  "используйте, например, mail.ru, Яндекс или почту вашей организации.";

/** Проверка адреса на соответствие политике. */
export function checkEmailPolicy(email: string): EmailCheck {
  const value = (email || "").trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) {
    return { ok: false, reason: "Укажите корректный email" };
  }
  const domain = value.slice(at + 1);
  if (BLOCKED_DOMAINS.has(domain)) {
    return { ok: false, reason: REASON };
  }
  return { ok: true };
}

/** Короткая проверка для форм (true — можно отправлять). */
export function isEmailAllowed(email: string): boolean {
  return checkEmailPolicy(email).ok;
}
