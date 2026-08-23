import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseCriteria, calcTotal, calcAvgTotal } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  await requireRole("admin", "superadmin");
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const nominationId = url.searchParams.get("nominationId") ?? "all";
  const region = url.searchParams.get("region") ?? "all";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  const where: any = {};
  if (status !== "all") where.status = status;
  if (nominationId !== "all") where.nominationId = nominationId;
  if (region !== "all") where.region = region;
  if (search) {
    where.OR = [
      { contactFio: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { orgName: { contains: search, mode: "insensitive" } },
      { region: { contains: search, mode: "insensitive" } },
      { inn: { contains: search, mode: "insensitive" } },
    ];
  }

  const apps = await db.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      nomination: { select: { id: true, title: true, criteria: true } },
      evaluations: { select: { scores: true } },
      events: { orderBy: { createdAt: "desc" }, take: 5, select: { actor: true, action: true, createdAt: true } },
      _count: { select: { evaluations: true } },
    },
  });

  const total = await db.application.count({ where });

  return NextResponse.json({
    total,
    page,
    totalPages: Math.ceil(total / limit),
    apps: apps.map((a: any) => {
      const criteria = parseCriteria(a.nomination.criteria);
      const totals = a.evaluations.map((e: any) => calcTotal((e.scores ?? {}) as Record<string, number>, criteria));
      return {
        id: a.id, orgName: a.orgName, contactFio: a.contactFio, email: a.email, region: a.region,
        status: a.status, createdAt: a.createdAt.toISOString(),
        nominationId: a.nominationId, nominationTitle: a.nomination.title,
        evalCount: a._count.evaluations,
        avgScore: calcAvgTotal(totals),
        lastEvents: a.events.map((e: any) => ({ actor: e.actor, action: e.action, at: e.createdAt.toISOString() })),
      };
    }),
  });
}
