import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * NextAuth v5: credentials-провайдер, роль в JWT и сессии (SPEC §2, §3).
 * Проверка прав на серверe в каждом защищённом роуте — на UI не полагаемся.
 */

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const vkSignInSchema = z.object({
  vkId: z.string().min(1),
  email: z.string().optional(),
  name: z.string().optional(),
});

// Антибрутфорс входа (in-memory, на инстанс; сбрасывается при рестарте).
const LOGIN_MAX_PER_IP = 20; // попыток с одного IP
const LOGIN_MAX_PER_EMAIL = 8; // попыток на один email
const LOGIN_WINDOW_MS = 10 * 60_000; // за 10 минут

/** Dev-пользователи (когда БД недоступна — локальная разработка). */
const DEV_USERS: Record<string, { id: string; fio: string; role: Role; hash: string }> = {
  "admin@test.ru": {
    id: "dev-admin-001",
    fio: "Орлова Мария Александровна",
    role: "superadmin",
    hash: "$2a$10$dummyHashForDevBypassOnly",
  },
  "jury1@test.ru": {
    id: "dev-jury1-002",
    fio: "Смирнова Анна Викторовна",
    role: "jury",
    hash: "$2a$10$dummyHashForDevBypassOnly",
  },
  "participant@test.ru": {
    id: "dev-part-003",
    fio: "Петров Пётр Петрович",
    role: "participant",
    hash: "$2a$10$dummyHashForDevBypassOnly",
  },
};
const DEV_PASSWORD = "TrudKrut2026!";

/** Проверяем доступность БД (один раз при старте). */
let dbAvailable: boolean | null = null;
async function isDbAvailable(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;
  try {
    await db.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    console.log("[auth] ⚠️  БД недоступна — используется dev-mock авторизация");
  }
  return dbAvailable;
}

/** Достаём IP клиента из заголовков прокси (nginx). */
function clientIp(req?: Request): string | null {
  const h = req?.headers;
  return (
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h?.get("x-real-ip") ||
    null
  );
}

/** Запись попытки входа в журнал. Никогда не бросает — логирование не должно ломать вход. */
async function logLogin(data: {
  email: string;
  success: boolean;
  reason?: string;
  userId?: string;
  role?: string;
  req?: Request;
}) {
  try {
    const ip = clientIp(data.req);
    const userAgent = data.req?.headers?.get("user-agent")?.slice(0, 300) || null;
    await db.loginEvent.create({
      data: {
        email: data.email.slice(0, 200),
        success: data.success,
        reason: data.reason ?? null,
        userId: data.userId ?? null,
        role: data.role ?? null,
        ip,
        userAgent,
      },
    });
  } catch {
    /* журнал не критичен для входа */
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // За nginx на VPS — доверяем заголовкам хоста (иначе NextAuth v5 отклоняет).
  trustHost: true,
  // JWT-сессия на 8 часов: рабочая смена, дальше повторный вход.
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = clientIp(req);

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // ── Dev-режим: БД недоступна → мок-пользователи ──
        if (process.env.NODE_ENV !== "production" && !(await isDbAvailable())) {
          const devUser = DEV_USERS[email];
          if (devUser && password === DEV_PASSWORD) {
            return { id: devUser.id, email, name: devUser.fio, role: devUser.role };
          }
          return null;
        }

        // Антибрутфорс по IP — до любой работы с БД.
        if (ip && !rateLimit(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS)) {
          await logLogin({ email, success: false, reason: "rate_limited", req });
          return null;
        }

        // Антибрутфорс по конкретному email (защита одной учётки).
        if (!rateLimit(`login:email:${email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS)) {
          await logLogin({ email, success: false, reason: "rate_limited", req });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          await logLogin({ email, success: false, reason: "no_user", req });
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          await logLogin({ email, success: false, reason: "bad_password", userId: user.id, role: user.role, req });
          return null;
        }

        await logLogin({ email: user.email, success: true, userId: user.id, role: user.role, req });
        return { id: user.id, email: user.email, name: user.fio, role: user.role };
      },
    }),
    Credentials({
      id: "vk",
      name: "VK",
      credentials: {
        vkId: { label: "VK ID", type: "text" },
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const parsed = vkSignInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { vkId, email, name } = parsed.data;

        if (process.env.NODE_ENV !== "production" && !(await isDbAvailable())) {
          return { id: `dev-vk-${vkId}`, email: email || `vk_${vkId}@placeholder.local`, name, role: "participant" };
        }

        // Ищем по vkUrl
        let user = await db.user.findFirst({ where: { vkUrl: `vk:${vkId}` } });

        // Или по email
        if (!user && email) {
          user = await db.user.findUnique({ where: { email } });
        }

        if (!user) {
          const { hashSync } = await import("bcryptjs");
          user = await db.user.create({
            data: {
              fio: name || `VK User ${vkId}`,
              email: email || `vk_${vkId}@placeholder.local`,
              passwordHash: hashSync(`vk_${Date.now()}`, 10),
              vkUrl: `vk:${vkId}`,
              emailVerified: email ? new Date() : null,
              role: "participant",
            },
          });
        } else {
          await db.user.update({
            where: { id: user.id },
            data: {
              vkUrl: user.vkUrl?.startsWith("vk:") ? user.vkUrl : `vk:${vkId}`,
              emailVerified: user.emailVerified || (email ? new Date() : null),
              fio: user.fio || name || `VK User ${vkId}`,
            },
          });
        }

        await logLogin({ email: user.email, success: true, userId: user.id, role: user.role });
        return { id: user.id, email: user.email, name: user.fio, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      // VK OAuth: ищем/создаём пользователя
      if (account?.provider === "vkid" && user) {
        token.role = user.role ?? "participant";
      }
      // Force-logout: проверяем блоклист сессий
      if (token?.id && typeof token.id === "string") {
        try {
          const { isSessionBlocked } = require("@/lib/session-blocklist");
          if (isSessionBlocked(token.id)) {
            return {} as any; // пустой токен → сессия сброшена
          }
        } catch { /* блоклист недоступен — пропускаем */ }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    redirect({ url, baseUrl }) {
      // После входа — на /profile для участников, иначе по роли
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/profile`;
    },
  },
});
