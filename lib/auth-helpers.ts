import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";

/**
 * Серверные хелперы авторизации для страниц.
 * В каждом серверном компоненте (page.tsx, layout.tsx) вызываем
 * requireRole(), requireAuth() или requireCompleteProfile() в самом начале.
 */

/** Проверяет роль. Нет сессии → /login; роль не подходит → на главную. */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roles.includes(session.user.role as Role)) redirect("/");
  return session;
}

/** Проверяет авторизацию. Если нет — редирект на /login. */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

/** Проверяет, что профиль заполнен. Если нет — редирект на /profile. */
export async function requireCompleteProfile() {
  const session = await requireAuth();

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        fio: true,
        phone: true,
        gender: true,
        birthDate: true,
        city: true,
        region: true,
      },
    });

    if (!user) redirect("/login");

    const complete = Boolean(
      user.fio && user.phone && user.gender && user.birthDate && user.city && user.region,
    );

    if (!complete) redirect("/profile");
  } catch {
    // Dev без БД — пропускаем проверку
  }

  return session;
}
