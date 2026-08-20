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
  const ExcelJS = await import("exceljs");

  const where: any = {};
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.nominationId && filters.nominationId !== "all") where.nominationId = filters.nominationId;
  if (filters.region && filters.region !== "all") where.region = filters.region;

  const apps = await db.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      nomination: { select: { id: true, title: true, criteria: true } },
      evaluations: { select: { scores: true, juryUserId: true } },
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    new: "5B8DEF", queued: "9A9AA4", review: "F5A623", revision: "E0703A",
    scoring: "8A5CF6", finalist: "2FBF6B", winner: "F5C518", rejected: "FF6B6B",
  };

  const wb = new ExcelJS.default.Workbook();
  wb.creator = "Труд Крут · Админка";
  wb.created = new Date();

  const ws = wb.addWorksheet("Заявки", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  // ── Title row ──────────────────────────────────────────────────────────
  ws.mergeCells("A1:R1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `Национальная премия «Труд Крут» — Заявки (${apps.length} шт.)`;
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0804FF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F0EC" } };
  ws.getRow(1).height = 32;

  // ── Column definitions ─────────────────────────────────────────────────
  const columns = [
    { header: "№", key: "num", width: 5 },
    { header: "Организация", key: "orgName", width: 28 },
    { header: "ФИО номинанта", key: "fio", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Телефон", key: "phone", width: 16 },
    { header: "Регион", key: "region", width: 20 },
    { header: "ИНН", key: "inn", width: 14 },
    { header: "Номинация", key: "nomination", width: 32 },
    { header: "Статус", key: "status", width: 20 },
    { header: "Средний балл", key: "avgScore", width: 13 },
    { header: "Оценок", key: "evalCount", width: 9 },
    { header: "Место работы", key: "workplace", width: 28 },
    { header: "Должность", key: "position", width: 22 },
    { header: "Дата подачи", key: "createdAt", width: 14 },
  ];

  // Add criteria columns from first nomination
  const firstNom = apps[0]?.nomination;
  const critDefs = ((firstNom?.criteria ?? []) as { label: string; maxScore?: number }[]) || [];
  for (const c of critDefs) {
    columns.push({ header: c.label, key: `crit_${c.label}`, width: Math.max(14, c.label.length + 4) });
  }

  ws.columns = columns;

  // ── Header row styling (row 2) ─────────────────────────────────────────
  const headerRow = ws.getRow(2);
  headerRow.height = 24;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0804FF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      bottom: { style: "medium" as const, color: { argb: "FF0603CC" } },
    };
  });

  // ── Data rows ──────────────────────────────────────────────────────────
  apps.forEach((a, idx) => {
    const p = (a.payload ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    const totals = a.evaluations.map((e: any) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    const avgScore = totals.length > 0 ? Math.round(totals.reduce((s: number, t: number) => s + t, 0) / totals.length) : null;

    const rowData: Record<string, any> = {
      num: idx + 1,
      orgName: a.orgName,
      fio: a.contactFio,
      email: a.email,
      phone: a.phone,
      region: a.region,
      inn: a.inn,
      nomination: a.nomination.title,
      status: STATUS_LABEL_RU[a.status as AppStatus] ?? a.status,
      avgScore: avgScore,
      evalCount: a.evaluations.length,
      workplace: str("workplace"),
      position: str("position"),
      createdAt: a.createdAt.toISOString().slice(0, 10),
    };

    // Criteria scores
    for (const c of critDefs) {
      const key = `crit_${c.label}`;
      const scores = a.evaluations.map((e: any) => {
        const s = (e.scores ?? {}) as Record<string, number>;
        return Number(s[c.label]) || 0;
      });
      rowData[key] = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : "";
    }

    const row = ws.addRow(rowData);
    row.height = 22;
    const rowIdx = row.number;

    // Alternate row coloring
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? "FFF8F7F3" : "FFFFFFFF";

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF333333" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = { vertical: "middle", horizontal: colNumber <= 1 ? "center" : "left" };
      cell.border = {
        bottom: { style: "thin" as const, color: { argb: "FFE8E8EC" } },
      };
    });

    // Status cell with color
    const statusCell = row.getCell("status");
    const statusColor = STATUS_COLORS[a.status] ?? "9A9AA4";
    statusCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF" + statusColor } };
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "18" + statusColor } };
    statusCell.alignment = { vertical: "middle", horizontal: "center" };

    // Score cell coloring
    const scoreCell = row.getCell("avgScore");
    if (avgScore !== null) {
      const scoreColor = avgScore >= 80 ? "2FBF6B" : avgScore >= 50 ? "F5A623" : "FF6B6B";
      scoreCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF" + scoreColor } };
      scoreCell.alignment = { vertical: "middle", horizontal: "center" };
    }

    // Number column center
    row.getCell("num").alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("evalCount").alignment = { vertical: "middle", horizontal: "center" };
    row.getCell("createdAt").alignment = { vertical: "middle", horizontal: "center" };
  });

  // ── Summary row ────────────────────────────────────────────────────────
  const summaryRow = ws.addRow([]);
  ws.addRow([]);
  const statsRow = ws.addRow([
    "", `Всего заявок: ${apps.length}`,
    "", "", "", "", "", "",
    `Финалистов: ${apps.filter((a) => a.status === "finalist").length}`,
    "", "", "", "", "",
  ]);
  statsRow.getCell(2).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF0804FF" } };
  const winnerRow = ws.addRow([
    "", `Победителей: ${apps.filter((a) => a.status === "winner").length}`,
    "", "", "", "", "",
    `Отклонено: ${apps.filter((a) => a.status === "rejected").length}`,
    "", "", "", "", "",
  ]);
  winnerRow.getCell(2).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF2FBF6B" } };
  winnerRow.getCell(8).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF6B6B" } };

  // ── Auto-filter on header ──────────────────────────────────────────────
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columns.length },
  };

  // ── Generate buffer ────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return { ok: true, base64, filename: `premia-apps-${new Date().toISOString().slice(0, 10)}.xlsx`, count: apps.length };
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
