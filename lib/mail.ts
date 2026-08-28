import nodemailer from "nodemailer";
import { db } from "@/lib/db";

/**
 * Почта (SPEC §2: nodemailer через SMTP из .env).
 * SMTP_HOST не задан → dev-заглушка: письмо печатается в консоль сервера.
 */

const useSmtp = Boolean(process.env.SMTP_HOST);

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const writeLog = async (status: "sent" | "failed", error?: string) => {
    try {
      await db.emailLog.create({ data: { to: opts.to.slice(0, 320), subject: opts.subject.slice(0, 500), status, error: error?.slice(0, 1000) } });
    } catch {
      // Mail delivery must not fail because the audit log is unavailable.
    }
  };

  if (!useSmtp) {
    console.log(
      [
        "",
        "════════ DEV MAIL (SMTP не настроен) ════════",
        `Кому: ${opts.to}`,
        `Тема: ${opts.subject}`,
        opts.html ? "(есть HTML-версия)" : "",
        "─────────────────────────────────────────────",
        opts.text,
        "═════════════════════════════════════════════",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    await writeLog("sent");
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 — SSL; 587/2525 — STARTTLS
    requireTLS: port !== 465, // на не-SSL портах принудительно шифруем через STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
    });
    await writeLog("sent");
  } catch (error) {
    await writeLog("failed", error instanceof Error ? error.message : "Unknown SMTP error");
    throw error;
  }
}
