let tgReady: boolean | null = null;

async function isTelegramConfigured(): Promise<boolean> {
  if (tgReady !== null) return tgReady;
  tgReady = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_NOTIFY_CHAT_ID);
  return tgReady;
}

export async function notifyAdminLogin(data: {
  email: string;
  fio: string;
  role: string;
  ip: string | null;
  geo: { country: string; city: string } | null;
  userAgent: string | null;
  isNewDevice: boolean;
}) {
  if (!(await isTelegramConfigured())) return;

  const flag = data.geo?.country ? getFlag(data.geo.country) : "🌐";
  const device = data.isNewDevice ? "🆕 *НОВОЕ УСТРОЙСТВО*" : "";
  const browser = parseBrowser(data.userAgent);
  const text = [
    `${flag} *Вход в админку*`,
    ``,
    `👤 ${data.fio}`,
    `📧 ${data.email}`,
    `🎭 ${data.role === "superadmin" ? "Суперадмин" : "Оргкомитет"}`,
    data.ip ? `📍 ${data.ip}` : "",
    data.geo ? `🌍 ${data.geo.country}, ${data.geo.city}` : "",
    browser ? `💻 ${browser}` : "",
    device,
    `🕐 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  ].filter(Boolean).join("\n");

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID!;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch { /* telegram не критичен */ }
}

export async function notifyFailedLogin(data: {
  email: string;
  ip: string | null;
  reason: string;
  geo: { country: string; city: string } | null;
}) {
  if (!(await isTelegramConfigured())) return;
  if (data.reason === "rate_limited") return;

  const flag = data.geo?.country ? getFlag(data.geo.country) : "🌐";
  const text = [
    `${flag} ⚠️ *Неудачная попытка входа*`,
    ``,
    `📧 ${data.email}`,
    data.ip ? `📍 ${data.ip}` : "",
    data.geo ? `🌍 ${data.geo.country}, ${data.geo.city}` : "",
    `❌ Причина: ${reasonLabel(data.reason)}`,
    `🕐 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
  ].filter(Boolean).join("\n");

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID!;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
    });
  } catch { /* telegram не критичен */ }
}

function reasonLabel(r: string | undefined): string {
  const map: Record<string, string> = {
    no_user: "Пользователь не найден",
    bad_password: "Неверный пароль",
    rate_limited: "Превышен лимит попыток",
  };
  return map[r ?? ""] ?? r ?? "неизвестно";
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "";
  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  const m = ua.match(/\(([^)]+)\)/);
  return m ? m[1].slice(0, 40) : ua.slice(0, 50);
}

function getFlag(country: string): string {
  const map: Record<string, string> = {
    "Russia": "🇷🇺", "Россия": "🇷🇺",
    "United States": "🇺🇸", "Germany": "🇩🇪", "France": "🇫🇷",
    "United Kingdom": "🇬🇧", "China": "🇨🇳", "Japan": "🇯🇵",
    "Kazakhstan": "🇰🇿", "Belarus": "🇧🇾", "Ukraine": "🇺🇦",
    "Turkey": "🇹🇷", "India": "🇮🇳", "Brazil": "🇧🇷",
  };
  return map[country] ?? "🌐";
}
