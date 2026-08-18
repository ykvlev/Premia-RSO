import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Экранирование значения для CSV (RFC 4180). */
function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(";"), ...rows.map((r) => r.map(cell).join(";"))];
  // BOM — чтобы Excel корректно открыл кириллицу в UTF-8.
  return "﻿" + lines.join("\r\n");
}
function fmt(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Экспорт журналов в CSV. Строго супер-админ.
 * /admin/super/export?type=logins|events|apps
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "superadmin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "logins";
  let csv: string;
  let name: string;

  if (type === "events") {
    const rows = await db.applicationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    csv = toCsv(
      ["Дата", "Актор", "Действие", "ID заявки"],
      rows.map((e) => [fmt(e.createdAt), e.actor, e.action, e.applicationId]),
    );
    name = "audit-events";
  } else if (type === "apps") {
    const rows = await db.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { nomination: { select: { title: true } } },
    });
    csv = toCsv(
      ["Дата", "Организация", "Контакт", "Email", "Телефон", "Регион", "Номинация", "Статус"],
      rows.map((a) => [
        fmt(a.createdAt),
        a.orgName,
        a.contactFio,
        a.email,
        a.phone,
        a.region,
        a.nomination.title,
        a.status,
      ]),
    );
    name = "applications";
  } else {
    const rows = await db.loginEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    csv = toCsv(
      ["Дата", "Email", "Роль", "Итог", "Причина", "IP", "User-Agent"],
      rows.map((l) => [
        fmt(l.createdAt),
        l.email,
        l.role ?? "",
        l.success ? "успех" : "отказ",
        l.reason ?? "",
        l.ip ?? "",
        l.userAgent ?? "",
      ]),
    );
    name = "login-events";
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.csv"`,
    },
  });
}
