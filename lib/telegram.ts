/**
 * Уведомления оргкомитету в Telegram (бот). Флаг-гейт: если не заданы
 * TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID — молча ничего не делает.
 * Настройка: создать бота у @BotFather, добавить в чат, взять chat_id.
 */

export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("Telegram sendMessage:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Telegram notify failed:", e);
  }
}

/** Экранирование под parse_mode=HTML. */
export function tgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
