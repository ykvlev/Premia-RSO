import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { AppStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_RU: Record<AppStatus, string> = {
  new: "Отправлена",
  queued: "Ожидает рассмотрения",
  review: "На рассмотрении",
  revision: "Требует доработки",
  scoring: "На оценке жюри",
  finalist: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};

/** Экспорт всех заявок в XLSX (для комиссии). Только admin/superadmin. */
export async function GET() {
  await requireRole("admin", "superadmin");

  const rows = await db.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { nomination: { select: { title: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Труд крут";
  const ws = wb.addWorksheet("Заявки");
  ws.columns = [
    { header: "№", key: "id", width: 26 },
    { header: "Дата", key: "date", width: 18 },
    { header: "Статус", key: "status", width: 16 },
    { header: "Номинация", key: "nomination", width: 44 },
    { header: "Номинант", key: "nominee", width: 28 },
    { header: "Заявитель", key: "applicant", width: 26 },
    { header: "Email", key: "email", width: 26 },
    { header: "Телефон", key: "phone", width: 18 },
    { header: "Регион", key: "region", width: 22 },
    { header: "Организация", key: "org", width: 30 },
    { header: "ИНН", key: "inn", width: 16 },
    { header: "Должность", key: "position", width: 24 },
    { header: "Комментарий эксперта", key: "comment", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const a of rows) {
    const p = (a.payload ?? {}) as Record<string, unknown>;
    const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    ws.addRow({
      id: a.id,
      date: a.createdAt.toLocaleString("ru-RU"),
      status: STATUS_RU[a.status],
      nomination: a.nomination.title,
      nominee: s("nomineeFio") || a.contactFio,
      applicant: s("applicantFio") || a.contactFio,
      email: a.email,
      phone: a.phone,
      region: a.region,
      org: s("workplace") || a.orgName,
      inn: a.inn,
      position: a.position ?? s("position"),
      comment: a.expertComment ?? "",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="zayavki-trudkrut.xlsx"',
    },
  });
}
