import { DarkLanding } from "@/components/landing/dark-landing";
import { db, safeDb } from "@/lib/db";

/**
 * Публичный лендинг — тёмный премиум-РСО. Живые счётчики (заявки/регионы/
 * номинации) считаются из БД и передаются в секцию «О премии».
 * Fallback: если БД недоступна — отдаём дефолтные значения.
 */
export const revalidate = 60;

const DEFAULT_STATS = {
  applications: 128,
  nominations: 11,
  regions: 32,
  regionCounts: {} as Record<string, number>,
  startAt: undefined as string | undefined,
  endAt: undefined as string | undefined,
};

export default async function Home() {
  const stats = await safeDb(async () => {
    const [applications, regionGroups, nominations, season] = await Promise.all([
      db.application.count(),
      db.application.groupBy({ by: ["region"], _count: { _all: true } }),
      db.nomination.count(),
      db.season.findFirst({ where: { isActive: true }, select: { startAt: true, endAt: true } }),
    ]);

    const regionCounts: Record<string, number> = {};
    for (const g of regionGroups) {
      if (g.region && g.region !== "—") regionCounts[g.region] = g._count._all;
    }

    return {
      applications,
      nominations,
      regions: Object.keys(regionCounts).length,
      regionCounts,
      startAt: season?.startAt.toISOString(),
      endAt: season?.endAt.toISOString(),
    };
  }, DEFAULT_STATS);

  return <DarkLanding stats={stats} />;
}
