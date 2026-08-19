import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Синглтон Prisma-клиента (Prisma 7: rust-free, драйвер-адаптер pg).
 * В dev переиспользуем инстанс между hot-reload'ами, чтобы не плодить коннекты.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Безопасный запрос к БД:
 *  - прод (NODE_ENV=production): ошибки пробрасываются как есть (ловятся Sentry / error boundary)
 *  - dev без БД: возвращает fallback, сайт работает
 */
export async function safeDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    console.warn("[db] Dev fallback (no database):", (err as Error).message?.slice(0, 120));
    return fallback;
  }
}
