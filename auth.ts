import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

/**
 * NextAuth v5: credentials-провайдер, роль в JWT и сессии (SPEC §2, §3).
 * Проверка прав на серверe в каждом защищённом роуте — на UI не полагаемся.
 */

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Антибрутфорс входа (in-memory, на инстанс; сбрасывается при рестарте).
const LOGIN_MAX_PER_IP = 20; // попыток с одного IP
const LOGIN_MAX_PER_EMAIL = 8; // попыток на один email
const LOGIN_WINDOW_MS = 10 * 60_000; // за 10 минут

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

        // Антибрутфорс по IP — до любой работы с БД.
        if (ip && !rateLimit(`login:ip:${ip}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS)) {
          const rawEmail =
            typeof credentials?.email === "string" ? credentials.email : "—";
          await logLogin({ email: rawEmail, success: false, reason: "rate_limited", req });
          return null;
        }

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          const rawEmail =
            typeof credentials?.email === "string" ? credentials.email : "—";
          await logLogin({ email: rawEmail, success: false, reason: "bad_input", req });
          return null;
        }

        // Антибрутфорс по конкретному email (защита одной учётки).
        if (!rateLimit(`login:email:${parsed.data.email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS)) {
          await logLogin({ email: parsed.data.email, success: false, reason: "rate_limited", req });
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          await logLogin({
            email: parsed.data.email,
            success: false,
            reason: "no_user",
            req,
          });
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await logLogin({
            email: parsed.data.email,
            success: false,
            reason: "bad_password",
            userId: user.id,
            role: user.role,
            req,
          });
          return null;
        }

        await logLogin({
          email: user.email,
          success: true,
          userId: user.id,
          role: user.role,
          req,
        });
        return { id: user.id, email: user.email, name: user.fio, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
