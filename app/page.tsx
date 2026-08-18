import { DarkLanding } from "@/components/landing/dark-landing";
import { db } from "@/lib/db";

/**
 * Публичный лендинг — тёмный премиум-РСО. Живые счётчики (заявки/регионы/
 * номинации) считаются из БД и передаются в секцию «О премии».
 */
export const revalidate = 60; // обновлять счётчики раз в минуту

export default async function Home() {
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
  const regions = Object.keys(regionCounts).length;

  return (
    <DarkLanding
      stats={{
        applications,
        regions,
        nominations,
        regionCounts,
        startAt: season?.startAt.toISOString(),
        endAt: season?.endAt.toISOString(),
      }}
    />
  );
}
