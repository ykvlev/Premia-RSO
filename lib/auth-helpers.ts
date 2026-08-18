import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * Серверная проверка прав (SPEC §2: в каждом защищённом роуте, не полагаться на UI).
 * Нет сессии → /login; есть сессия, но роль не подходит → на главную.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}
