import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ManagementPanel } from "@/components/admin/management-panel";

export const metadata: Metadata = { title: "Управление заявками · Админка" };
export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  await requireRole("admin", "superadmin");

  const [apps, nominations, regions, templates, totalCount] = await Promise.all([
    db.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        nomination: { select: { id: true, title: true } },
        evaluations: { select: { scores: true } },
        events: { orderBy: { createdAt: "desc" }, take: 5, select: { actor: true, action: true, createdAt: true } },
        _count: { select: { evaluations: true } },
      },
    }),
    db.nomination.findMany({ select: { id: true, title: true } }),
    db.application.findMany({ select: { region: true }, distinct: ["region"], orderBy: { region: "asc" } }),
    db.notificationTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    db.application.count(),
  ]);

  // Jury workload
  const juryUsers = await db.user.findMany({ where: { role: "jury" }, select: { id: true, fio: true, email: true } });
  const allAssignments = await db.juryAssignment.findMany({ select: { juryUserId: true, nominationId: true } });
  const allEvaluations = await db.evaluation.findMany({ select: { juryUserId: true, scores: true } });
  const allRecusals = await db.juryRecusal.findMany({ select: { juryUserId: true } });
  const nomCounts = await db.application.groupBy({ by: ["nominationId"], _count: { _all: true } });
  const nomCountMap = new Map(nomCounts.map((n) => [n.nominationId, n._count._all]));

  const juryWorkload = juryUsers.map((u) => {
    const assigned = allAssignments
      .filter((a) => a.juryUserId === u.id)
      .reduce((sum, a) => sum + (nomCountMap.get(a.nominationId) ?? 0), 0);
    const evaluated = allEvaluations.filter((e) => e.juryUserId === u.id).length;
    const recused = allRecusals.filter((r) => r.juryUserId === u.id).length;
    const scores = allEvaluations.filter((e) => e.juryUserId === u.id).map((e) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    return {
      id: u.id, fio: u.fio, email: u.email, assigned, evaluated, recused,
      pending: Math.max(0, assigned - evaluated - recused),
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });

  const mappedApps = apps.map((a) => {
    const totals = a.evaluations.map((e) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    return {
      id: a.id, orgName: a.orgName, contactFio: a.contactFio, email: a.email, region: a.region,
      status: a.status, createdAt: a.createdAt.toISOString(),
      nominationId: a.nominationId, nominationTitle: a.nomination.title,
      evalCount: a._count.evaluations,
      avgScore: totals.length > 0 ? Math.round(totals.reduce((s: number, t: number) => s + t, 0) / totals.length) : null,
      lastEvents: a.events.map((e) => ({ actor: e.actor, action: e.action, at: e.createdAt.toISOString() })),
    };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#08080a", fontFamily: "var(--font-onest), sans-serif" }}>
      <header style={{ padding: "16px 28px", borderBottom: "1px solid #22222a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/admin" style={{ color: "#9a9aa4", fontSize: 13, textDecoration: "none" }}>← Админка</a>
          <h1 style={{ color: "#f2f0ec", fontSize: 18, fontWeight: 700, margin: 0 }}>Управление заявками</h1>
        </div>
        <span style={{ color: "#6a6a72", fontSize: 12 }}>{totalCount} заявок</span>
      </header>
      <ManagementPanel
        initialApps={mappedApps}
        total={totalCount}
        page={1}
        totalPages={Math.ceil(totalCount / 50)}
        nominations={nominations}
        regions={regions.map((r) => r.region).filter(Boolean) as string[]}
        juryWorkload={juryWorkload}
        templates={templates}
      />
    </div>
  );
}
