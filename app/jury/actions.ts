"use server";

import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { AppStatus } from "@/lib/generated/prisma/client";

const VALID_STATUS: AppStatus[] = [
  "new",
  "queued",
  "review",
  "revision",
  "scoring",
  "finalist",
  "winner",
  "rejected",
];

/** Права текущего пользователя (админ — все; жюри — из профиля). */
async function myPerms(userId: string, role: string) {
  if (role === "admin" || role === "superadmin") {
    return {
      score: true,
      comment: true,
      changeStatus: true,
      viewContacts: true,
      blindScoring: false,
    };
  }
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { permissions: true },
  });
  const p = (u?.permissions ?? {}) as Record<string, unknown>;
  return {
    score: p.score !== false,
    comment: p.comment !== false,
    changeStatus: p.changeStatus === true,
    viewContacts: p.viewContacts === true,
    blindScoring: p.blindScoring === true,
  };
}

/**
 * Скоуп жюри: действовать можно только по заявкам в закреплённых номинациях.
 * Админ/суперадмин — без ограничений. Возвращает true, если доступ разрешён.
 */
async function juryCanAccess(userId: string, role: string, applicationId: string) {
  if (role === "admin" || role === "superadmin") return true;
  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { nominationId: true },
  });
  if (!app) return false;
  const assigned = await db.juryAssignment.findFirst({
    where: { juryUserId: userId, nominationId: app.nominationId },
    select: { id: true },
  });
  return !!assigned;
}

/** Самоотвод жюри по заявке (конфликт интересов). Переключатель: вкл/выкл. */
export async function toggleRecusal(applicationId: string) {
  const session = await requireRole("jury", "admin", "superadmin");
  const juryUserId = session.user.id;
  if (!(await juryCanAccess(juryUserId, session.user.role, applicationId))) {
    return { ok: false as const, error: "Заявка не в вашей номинации" };
  }
  const existing = await db.juryRecusal.findUnique({
    where: { juryUserId_applicationId: { juryUserId, applicationId } },
    select: { id: true },
  });
  if (existing) {
    await db.juryRecusal.delete({ where: { id: existing.id } });
    return { ok: true as const, recused: false };
  }
  await db.juryRecusal.create({ data: { juryUserId, applicationId } });
  // взял самоотвод — снимаем его оценку, если была
  await db.evaluation
    .delete({ where: { applicationId_juryUserId: { applicationId, juryUserId } } })
    .catch(() => {});
  return { ok: true as const, recused: true };
}

/** Смена статуса заявки жюри — только при праве changeStatus. */
export async function juryUpdateStatus(applicationId: string, status: string) {
  const session = await requireRole("jury", "admin", "superadmin");
  if (!(await juryCanAccess(session.user.id, session.user.role, applicationId))) {
    return { ok: false as const, error: "Заявка не в вашей номинации" };
  }
  const perms = await myPerms(session.user.id, session.user.role);
  if (!perms.changeStatus) return { ok: false as const, error: "Нет прав на смену статуса" };
  if (!VALID_STATUS.includes(status as AppStatus)) {
    return { ok: false as const, error: "Неизвестный статус" };
  }
  await db.application.update({
    where: { id: applicationId },
    data: { status: status as AppStatus },
  });
  return { ok: true as const };
}

/**
 * Сохранение оценки жюри по заявке (upsert по уникальной паре
 * applicationId+juryUserId). scores — {criteriaKey: балл}; для номинаций без
 * критериев используется ключ "overall". Права проверяются по профилю.
 */
export async function submitEvaluation(input: {
  applicationId: string;
  scores: Record<string, number>;
  comment: string;
}) {
  const session = await requireRole("jury", "admin", "superadmin");
  const juryUserId = session.user.id;
  if (!(await juryCanAccess(juryUserId, session.user.role, input.applicationId))) {
    return { ok: false as const, error: "Заявка не в вашей номинации" };
  }
  const perms = await myPerms(juryUserId, session.user.role);
  if (!perms.score && !perms.comment) {
    return { ok: false as const, error: "Нет прав на оценку" };
  }

  const app = await db.application.findUnique({
    where: { id: input.applicationId },
    select: { id: true },
  });
  if (!app) return { ok: false as const, error: "Заявка не найдена" };

  // сохраняем только то, что разрешено правами
  const scores: Record<string, number> = {};
  if (perms.score) {
    for (const [k, v] of Object.entries(input.scores)) {
      const n = Number(v);
      scores[k] = Number.isFinite(n) ? n : 0;
    }
  }
  const comment = perms.comment ? input.comment.trim() : "";

  await db.evaluation.upsert({
    where: {
      applicationId_juryUserId: { applicationId: input.applicationId, juryUserId },
    },
    create: { applicationId: input.applicationId, juryUserId, scores, comment },
    update: { scores, comment },
  });

  return { ok: true as const };
}
