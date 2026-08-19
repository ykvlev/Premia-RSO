"use server";

import { compareSync, hashSync } from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkPasswordBreach } from "@/lib/password-breach";

/** Смена пароля текущим пользователем (участник/жюри/админ). */
export async function changePassword(current: string, next: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false as const, error: "Требуется вход" };
  }
  if (next.length < 8) {
    return { ok: false as const, error: "Новый пароль — минимум 8 символов" };
  }

  // Проверка по базе утёкших паролей (HIBP)
  const breachCount = await checkPasswordBreach(next);
  if (breachCount > 0) {
    return {
      ok: false as const,
      error: `Этот пароль был обнаружен в ${breachCount.toLocaleString("ru-RU")} утечках данных. Выберите другой пароль.`,
    };
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { ok: false as const, error: "Пользователь не найден" };
  if (!compareSync(current, user.passwordHash)) {
    return { ok: false as const, error: "Текущий пароль неверный" };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashSync(next, 10) },
  });
  return { ok: true as const };
}
