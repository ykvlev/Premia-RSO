/**
 * Yandex SmartCaptcha (SPEC §7 п.5). Ключ не задан → заглушка: проверка
 * всегда проходит (dev). На проде задать SMARTCAPTCHA_SERVER_KEY и
 * NEXT_PUBLIC_SMARTCAPTCHA_CLIENT_KEY.
 */
export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  const serverKey = process.env.SMARTCAPTCHA_SERVER_KEY;
  if (!serverKey) return true; // заглушка

  if (!token) return false;

  const res = await fetch("https://smartcaptcha.yandexcloud.net/validate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: serverKey, token }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "ok";
}
