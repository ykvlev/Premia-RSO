"use server";

import crypto from "node:crypto";
import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export type JuryPermissions = {
  score: boolean;
  comment: boolean;
  changeStatus: boolean;
  viewContacts: boolean;
  blindScoring: boolean;
};

const DEFAULT_PERMS: JuryPermissions = {
  score: true,
  comment: true,
  changeStatus: false,
  viewContacts: false,
  blindScoring: false,
};

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function translit(word: string): string {
  return [...word.toLowerCase()]
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : /[a-z0-9]/.test(ch) ? ch : ""))
    .join("");
}

/** Логин-псевдоemail из ФИО: familia.imya@trudkrut.ru (уникальный). */
async function makeLogin(fio: string): Promise<string> {
  const parts = fio.trim().split(/\s+/).slice(0, 2).map(translit).filter(Boolean);
  const base = parts.join(".") || "jury";
  for (let i = 0; i < 50; i++) {
    const suffix = i === 0 ? "" : String(i + 1);
    const login = `${base}${suffix}@trudkrut.ru`;
    const exists = await db.user.findUnique({ where: { email: login } });
    if (!exists) return login;
  }
  return `jury.${crypto.randomInt(100000, 999999)}@trudkrut.ru`;
}

function genPassword(): string {
  const AL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => AL[crypto.randomInt(AL.length)]).join("");
}

/** Создать профиль жюри — логин и пароль генерируются автоматически. */
export async function createJury(input: { fio: string; nominationIds?: string[] }) {
  await requireRole("admin", "superadmin");
  const fio = input.fio.trim();
  if (fio.length < 2) return { ok: false as const, error: "Укажите ФИО" };

  const login = await makeLogin(fio);
  const password = genPassword();

  const user = await db.user.create({
    data: {
      fio,
      email: login,
      role: "jury",
      passwordHash: hashSync(password, 10),
      permissions: DEFAULT_PERMS,
    },
    select: { id: true },
  });

  const noms = (input.nominationIds ?? []).filter(Boolean);
  if (noms.length) {
    await db.juryAssignment.createMany({
      data: noms.map((nominationId) => ({ juryUserId: user.id, nominationId })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/jury");
  return { ok: true as const, login, password, id: user.id };
}

/** Заменить набор закреплённых номинаций жюри. */
export async function setJuryNominations(juryUserId: string, nominationIds: string[]) {
  await requireRole("admin", "superadmin");
  const noms = nominationIds.filter(Boolean);
  await db.$transaction([
    db.juryAssignment.deleteMany({ where: { juryUserId } }),
    ...(noms.length
      ? [
          db.juryAssignment.createMany({
            data: noms.map((nominationId) => ({ juryUserId, nominationId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
  revalidatePath("/admin/jury");
  return { ok: true as const };
}

/** Обновить права жюри. */
export async function setJuryPermissions(juryUserId: string, permissions: JuryPermissions) {
  await requireRole("admin", "superadmin");
  await db.user.update({
    where: { id: juryUserId },
    data: {
      permissions: {
        score: !!permissions.score,
        comment: !!permissions.comment,
        changeStatus: !!permissions.changeStatus,
        viewContacts: !!permissions.viewContacts,
        blindScoring: !!permissions.blindScoring,
      },
    },
  });
  revalidatePath("/admin/jury");
  return { ok: true as const };
}

/** Сгенерировать жюри новый пароль (показывается админу один раз). */
export async function regenerateJuryPassword(juryUserId: string) {
  await requireRole("admin", "superadmin");
  const user = await db.user.findUnique({
    where: { id: juryUserId },
    select: { role: true },
  });
  if (!user || user.role !== "jury") return { ok: false as const, error: "Не найдено" };
  const password = genPassword();
  await db.user.update({
    where: { id: juryUserId },
    data: { passwordHash: hashSync(password, 10) },
  });
  return { ok: true as const, password };
}

/** Удалить профиль жюри вместе с оценками и закреплениями. */
export async function deleteJury(juryUserId: string) {
  await requireRole("admin", "superadmin");
  const user = await db.user.findUnique({
    where: { id: juryUserId },
    select: { role: true },
  });
  if (!user || user.role !== "jury") return { ok: false as const, error: "Не найдено" };
  await db.$transaction([
    db.evaluation.deleteMany({ where: { juryUserId } }),
    db.juryAssignment.deleteMany({ where: { juryUserId } }),
    db.juryRecusal.deleteMany({ where: { juryUserId } }),
    db.user.delete({ where: { id: juryUserId } }),
  ]);
  revalidatePath("/admin/jury");
  return { ok: true as const };
}
