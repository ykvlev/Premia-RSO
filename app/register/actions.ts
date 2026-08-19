"use server";

import { hashSync } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { renderVerificationCodeEmail } from "@/lib/email";
import { checkPasswordBreach } from "@/lib/password-breach";

/**
 * Серверные action'ы регистрации:
 *  1. sendVerificationCode — генерация + отправка 6-значного кода на email
 *  2. verifyCode — проверка кода (возвращает токен для下一步 регистрации)
 *  3. registerUser — создание аккаунта по verified-токену
 */

const CODE_TTL_MS = 10 * 60_000; // 10 минут
const CODE_LENGTH = 6;

// ── Rate limiting ───────────────────────────────────────────────────────────
const MAX_CODES_PER_EMAIL = 3; // за окно
const MAX_CODES_PER_IP = 5;
const RL_WINDOW_MS = 15 * 60_000; // 15 минут

// ── Схемы ──────────────────────────────────────────────────────────────────
const emailSchema = z.email();
const codeSchema = z.string().length(CODE_LENGTH);
const passwordSchema = z.string().min(8).max(128);

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

function getIp(): string | null {
  // Next.js server actions don't have direct access to request headers,
  // but we can use a workaround via headers()
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

// ── 1. Отправка кода ───────────────────────────────────────────────────────
export async function sendVerificationCode(
  emailRaw: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw.trim().toLowerCase();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { ok: false, error: "Некорректный email" };
  }

  // Rate limit по email
  if (!rateLimit(`reg:email:${email}`, MAX_CODES_PER_EMAIL, RL_WINDOW_MS)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте через 15 минут." };
  }

  // Rate limit по IP
  const ip = getIp();
  if (ip && !rateLimit(`reg:ip:${ip}`, MAX_CODES_PER_IP, RL_WINDOW_MS)) {
    return { ok: false, error: "Слишком много запросов. Попробуйте через 15 минут." };
  }

  // Проверяем, не зарегистрирован ли уже email
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "Email уже зарегистрирован. Войдите в аккаунт." };
    }
  } catch {
    // В dev без БД — пропускаем проверку
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера. Попробуйте позже." };
    }
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Сохраняем код в БД (upsert: удаляем старые коды для этого email)
  try {
    await db.passwordReset.deleteMany({ where: { email, used: false } });
    await db.passwordReset.create({
      data: { email, code, expiresAt },
    });
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера. Попробуйте позже." };
    }
  }

  // Отправляем письмо
  try {
    const { html, text } = renderVerificationCodeEmail(code);
    await sendMail({
      to: email,
      subject: "Код подтверждения — Труд Крут",
      text,
      html,
    });
  } catch (err) {
    console.error("[register] Email send failed:", err);
    return { ok: false, error: "Не удалось отправить письмо. Попробуйте позже." };
  }

  return { ok: true };
}

// ── 2. Проверка кода ───────────────────────────────────────────────────────
export async function verifyCode(
  emailRaw: string,
  code: string,
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const email = emailRaw.trim().toLowerCase();

  if (code.length !== CODE_LENGTH || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Код должен содержать 6 цифр" };
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

    // Генерируем токен верификации (cuid + timestamp для уникальности)
    const token = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Сохраняем токен верификации (используем passwordReset с special code)
    const tokenExpiresAt = new Date(Date.now() + 30 * 60_000); // 30 минут
    await db.passwordReset.create({
      data: {
        email,
        code: `TOKEN:${token}`,
        expiresAt: tokenExpiresAt,
      },
    });

    return { ok: true, token };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера. Попробуйте позже." };
    }
    // Dev без БД — пропускаем
    return { ok: true, token: `dev_token_${Date.now()}` };
  }
}

// ── 3. Регистрация пользователя ────────────────────────────────────────────
export async function registerUser(params: {
  token: string;
  email: string;
  password: string;
  fio: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  city?: string;
  region?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { token, email: emailRaw, password, fio, phone, gender, birthDate, city, region } = params;
  const email = emailRaw.trim().toLowerCase();

  // Валидация
  if (!token || !token.startsWith("reg_")) {
    return { ok: false, error: "Недействительный токен верификации" };
  }
  if (!emailSchema.safeParse(email).success) {
    return { ok: false, error: "Некорректный email" };
  }
  if (!passwordSchema.safeParse(password).success) {
    return { ok: false, error: "Пароль должен содержать от 8 до 128 символов" };
  }

  // Проверка по базе утёкших паролей (HIBP)
  const breachCount = await checkPasswordBreach(password);
  if (breachCount > 0) {
    return {
      ok: false,
      error: `Этот пароль был обнаружен в ${breachCount.toLocaleString("ru-RU")} утечках данных. Выберите другой пароль.`,
    };
  }
  if (!fio.trim() || fio.trim().length < 2) {
    return { ok: false, error: "Введите ФИО" };
  }

  // Проверяем токен верификации
  try {
    const record = await db.passwordReset.findFirst({
      where: { email, code: `TOKEN:${token}`, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { ok: false, error: "Токен верификации недействителен" };
    }

    if (record.expiresAt < new Date()) {
      return { ok: false, error: "Токен верификации истёк. Пройдите регистрацию заново." };
    }

    // Помечаем токен как использованный
    await db.passwordReset.update({
      where: { id: record.id },
      data: { used: true },
    });
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера. Попробуйте позже." };
    }
    // Dev без БД — пропускаем проверку токена
  }

  // Проверяем, не зарегистрирован ли уже
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "Email уже зарегистрирован" };
    }
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Ошибка сервера" };
    }
  }

  // Создаём пользователя
  const passwordHash = hashSync(password, 10);

  try {
    await db.user.create({
      data: {
        fio: fio.trim(),
        email,
        passwordHash,
        emailVerified: new Date(),
        role: "participant",
        ...(phone ? { phone: phone.trim() } : {}),
        ...(gender ? { gender } : {}),
        ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
        ...(city ? { city: city.trim() } : {}),
        ...(region ? { region: region.trim() } : {}),
      },
    });
  } catch (err) {
    console.error("[register] User creation failed:", err);
    return { ok: false, error: "Ошибка создания аккаунта. Попробуйте позже." };
  }

  return { ok: true };
}
