import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  await requireRole("superadmin");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  const where: Record<string, string> = {};
  if (status && status !== "all") where.status = status;

  const logs = await db.emailLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });
  const total = await db.emailLog.count({ where });
  const failed = await db.emailLog.count({ where: { status: "failed" } });
  const sent = await db.emailLog.count({ where: { status: "sent" } });
  return NextResponse.json({ logs, total, failed, sent });
}
