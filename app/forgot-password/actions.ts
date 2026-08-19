"use server";

import { hashSync } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { renderPasswordResetEmail } from "@/lib/email";
import { checkPasswordBreach } from "@/lib/password-breach";

const CODE_TTL_MS = 10 * 60_000;
const CODE_LENGTH = 6;

const MAX_CODES_PER_EMAIL = 3;
const MAX_CODES_PER_IP = 5;
const RL_WINDOW_MS = 15 * 60_000;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

function getIp(): string | null {
  try {
    const { headers } = require("next/headers");
    const h = headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null
    );
  } catch {
    return null;
  }
}

/** Отправка кода восстановления пароля. */
export async function sendResetCode(
  emailRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw.trim().toLowerCase();

  if (!z.email().safeParse(email).success) {
    return { ok: false, error: "Некорректный email" };
  }

  if (!rateLimit(`reset:email:${email}`, MAX_CODES_PER_EMAIL, RL_WINDOW_MS)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте через 15 минут." };
  }

  const ip = getIp();
  if (ip && !rateLimit(`reset:ip:${ip}`, MAX_CODES_PER_IP, RL_WINDOW_MS)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте через 15 минут." };
  }

  // Проверяем, существует ли пользователь
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Не раскрываем информацию о существовании аккаунта
      return { ok: true };
    }
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера" };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  try {
    await db.passwordReset.deleteMany({ where: { email, used: false } });
    await db.passwordReset.create({
      data: { email, code, expiresAt },
    });
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера" };
    }
  }

  try {
    const { html, text } = renderPasswordResetEmail(code);
    await sendMail({
      to: email,
      subject: "Код восстановления пароля — Труд Крут",
      text,
      html,
    });
  } catch (err) {
    console.error("[forgot-password] Email send failed:", err);
    return { ok: false, error: "Не удалось отправить письмо" };
  }

  return { ok: true };
}

/** Проверка кода и сброс пароля. */
export async function resetPassword(
  emailRaw: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw.trim().toLowerCase();

  if (code.length !== CODE_LENGTH || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Код должен содержать 6 цифр" };
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: "Пароль должен содержать от 8 до 128 символов" };
  }

  // Проверка по базе утёкших паролей (HIBP)
  const breachCount = await checkPasswordBreach(newPassword);
  if (breachCount > 0) {
    return {
      ok: false,
      error: `Этот пароль был обнаружен в ${breachCount.toLocaleString("ru-RU")} утечках данных. Выберите другой пароль.`,
    };
  }

  try {
    const record = await db.passwordReset.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { ok: false, error: "Код не найден. Запросите новый." };
    }

    if (record.expiresAt < new Date()) {
      return { ok: false, error: "Код истёк. Запросите новый." };
    }

    if (record.code !== code) {
      return { ok: false, error: "Неверный код" };
    }

    // Помечаем код как использованный
    await db.passwordReset.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Обновляем пароль
    const passwordHash = hashSync(newPassword, 10);
    await db.user.update({
      where: { email },
      data: { passwordHash },
    });
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера. Попробуйте позже." };
    }
  }

  return { ok: true };
}
