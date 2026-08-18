import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { RankingBoard, type RankNomination } from "@/components/admin/ranking-board";

export const metadata: Metadata = { title: "Итоговый рейтинг" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

/** Итоговый рейтинг по номинациям: средний балл жюри, авто-порядок, выбор победителей. */
export default async function RankingPage() {
  await requireRole("admin", "superadmin");

  const noms = await db.nomination.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const rows = await db.application.findMany({
    include: {
      nomination: { select: { id: true } },
      evaluations: { select: { scores: true } },
    },
  });

  const byNom = new Map<string, RankNomination>();
  for (const n of noms) byNom.set(n.id, { id: n.id, title: n.title, apps: [] });

  for (const a of rows) {
    const bucket = byNom.get(a.nominationId);
    if (!bucket) continue;
    const totals = a.evaluations.map((e) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    const avg =
      totals.length > 0
        ? Math.round((totals.reduce((s, t) => s + t, 0) / totals.length) * 10) / 10
        : null;
    const p = (a.payload ?? {}) as Record<string, unknown>;
    const nominee =
      (typeof p.nomineeFio === "string" && p.nomineeFio) || a.contactFio || a.orgName;
    bucket.apps.push({
      id: a.id,
      nominee,
      region: a.region,
      avg,
      count: totals.length,
      status: a.status,
    });
  }

  // сортировка внутри номинации: по среднему баллу (оценённые выше), потом по числу оценок
  const nominations: RankNomination[] = [...byNom.values()]
    .map((n) => ({
      ...n,
      apps: n.apps.sort((x, y) => (y.avg ?? -1) - (x.avg ?? -1) || y.count - x.count),
    }))
    .filter((n) => n.apps.length > 0);

  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 28px 80px" }}>
        <h1 style={{ color: "#f2f0ec", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
          Итоговый рейтинг по номинациям
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 28px" }}>
          Заявки ранжированы по среднему баллу жюри. Отсюда можно назначить финалистов
          и победителей — статус сразу обновится и заявителю уйдёт письмо.
        </p>
        <RankingBoard nominations={nominations} />
      </div>
    </main>
  );
}
