"use server";

import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { AppStatus } from "@/lib/generated/prisma/client";

const STATUS_LABEL_RU: Record<AppStatus, string> = {
  new: "Отправлена", queued: "Ожидает рассмотрения", review: "На рассмотрении",
  revision: "Требует доработки", scoring: "На оценке жюри", finalist: "Финалист",
  winner: "Победитель", rejected: "Отклонена",
};

export async function getJuryWorkload() {
  await requireRole("admin", "superadmin");

  const juryUsers = await db.user.findMany({
    where: { role: "jury" },
    select: { id: true, fio: true, email: true },
  });

  const assignments = await db.juryAssignment.findMany({
    select: { juryUserId: true, nominationId: true },
  });

  const evaluations = await db.evaluation.findMany({
    select: { juryUserId: true, applicationId: true, scores: true, createdAt: true },
  });

  const recusals = await db.juryRecusal.findMany({
    select: { juryUserId: true },
  });

  // Get application count per nomination for assignment mapping
  const nomCounts = await db.application.groupBy({
    by: ["nominationId"],
    _count: { _all: true },
  });
  const nomCountMap = new Map(nomCounts.map((n) => [n.nominationId, n._count._all]));

  return juryUsers.map((u) => {
    const assigned = assignments
      .filter((a) => a.juryUserId === u.id)
      .reduce((sum, a) => sum + (nomCountMap.get(a.nominationId) ?? 0), 0);
    const evaluated = evaluations.filter((e) => e.juryUserId === u.id).length;
    const recused = recusals.filter((r) => r.juryUserId === u.id).length;
    const scores = evaluations.filter((e) => e.juryUserId === u.id).map((e) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    return {
      id: u.id, fio: u.fio, email: u.email, assigned, evaluated, recused,
      pending: Math.max(0, assigned - evaluated - recused),
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });
}

export async function assignJuryToNomination(juryUserId: string, nominationId: string) {
  await requireRole("admin", "superadmin");

  const existing = await db.juryAssignment.findUnique({
    where: { juryUserId_nominationId: { juryUserId, nominationId } },
  });

  if (!existing) {
    await db.juryAssignment.create({ data: { juryUserId, nominationId } });
  }

  const appCount = await db.application.count({
    where: { nominationId, status: { notIn: ["rejected", "winner"] } },
  });

  return { ok: true, assigned: appCount };
}

export async function addInternalComment(applicationId: string, comment: string) {
  const session = await requireRole("admin", "superadmin");
  const actor = session.user.email ?? "оргкомитет";

  await db.application.update({
    where: { id: applicationId },
    data: { internalNote: comment.trim() || null },
  });

  await db.applicationEvent.create({
    data: { applicationId, actor, action: comment.trim() ? "Обновлена внутренняя заметка" : "Удалена внутренняя заметка" },
  });

  return { ok: true };
}

export async function getApplicationTimeline(applicationId: string) {
  await requireRole("admin", "superadmin");

  const events = await db.applicationEvent.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, actor: true, action: true, createdAt: true },
  });

  const evaluations = await db.evaluation.findMany({
    where: { applicationId },
    select: { juryUserId: true, scores: true, createdAt: true, comment: true },
    orderBy: { createdAt: "desc" },
  });

  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { createdAt: true, status: true, contactFio: true },
  });

  return {
    app: app ? { contactFio: app.contactFio, status: app.status, createdAt: app.createdAt.toISOString() } : null,
    events: events.map((e) => ({
      id: e.id, actor: e.actor, action: e.action, at: e.createdAt.toISOString(), type: "event" as const,
    })),
    evaluations: evaluations.map((e) => ({
      juryUserId: e.juryUserId, scores: e.scores, comment: e.comment, at: e.createdAt.toISOString(), type: "evaluation" as const,
    })),
  };
}

export async function getNotificationTemplates() {
  await requireRole("admin", "superadmin");
  return db.notificationTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createNotificationTemplate(name: string, subject: string, body: string, category: string) {
  await requireRole("admin", "superadmin");
  return db.notificationTemplate.create({ data: { name, subject, body, category } });
}

export async function deleteNotificationTemplate(id: string) {
  await requireRole("admin", "superadmin");
  await db.notificationTemplate.delete({ where: { id } });
  return { ok: true };
}

export async function exportApplicationsToExcel(filters: {
  status?: string;
  nominationId?: string;
  region?: string;
}) {
  await requireRole("admin", "superadmin");

  const where: any = {};
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.nominationId && filters.nominationId !== "all") where.nominationId = filters.nominationId;
  if (filters.region && filters.region !== "all") where.region = filters.region;

  const apps = await db.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      nomination: { select: { title: true } },
      evaluations: { select: { scores: true } },
    },
  });

  const header = "ID,Организация,ФИО,Email,Телефон,Регион,Статус,Номинация,ИНН,Средний балл,Кол-во оценок,Место работы,Должность,Дата подачи";
  const rows = apps.map((a: any) => {
    const p = (a.payload ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    const totals = a.evaluations.map((e: any) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    const avgScore = totals.length > 0 ? Math.round(totals.reduce((s: number, t: number) => s + t, 0) / totals.length) : "";
    return `"${a.id}","${a.orgName}","${a.contactFio}","${a.email}","${a.phone}","${a.region}","${STATUS_LABEL_RU[a.status as AppStatus] ?? a.status}","${a.nomination.title}","${a.inn}","${avgScore}","${a.evaluations.length}","${str("workplace")}","${str("position")}","${a.createdAt.toISOString().slice(0, 10)}"`;
  });

  return { csv: [header, ...rows].join("\n"), count: rows.length };
}

export async function getRegions() {
  await requireRole("admin", "superadmin");
  const regions = await db.application.findMany({
    select: { region: true },
    distinct: ["region"],
    orderBy: { region: "asc" },
  });
  return regions.map((r) => r.region).filter(Boolean);
}
