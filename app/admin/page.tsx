import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db, safeDb } from "@/lib/db";
import { getDownloadUrl } from "@/lib/storage";
import { parseCriteria, calcTotal, calcAvgTotal } from "@/lib/scoring";
import {
  AdminApp,
  type Application as MockApp,
  type AdminUser,
} from "@/components/admin/admin-app";
import type { AppStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Админ-панель" };
export const dynamic = "force-dynamic";

/** Статус БД → статус макета (finalist ↔ approved). */
const DB_TO_MOCK: Record<AppStatus, MockApp["status"]> = {
  new: "new",
  queued: "queued",
  review: "review",
  revision: "revision",
  scoring: "scoring",
  finalist: "approved",
  winner: "winner",
  rejected: "rejected",
};

/**
 * Админ-панель — тёмный макет заказчика (Figma Make), на РЕАЛЬНЫХ данных БД
 * и нашей авторизации (NextAuth). Заявки из БД маппятся в форму макета;
 * смена статуса персистится (см. app/admin/actions.ts).
 */
export default async function AdminPage() {
  const session = await requireRole("admin", "superadmin");

  const initialApps = await safeDb(async () => {
    const rows = await db.application.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        nomination: { select: { id: true, title: true, criteria: true, formSchema: true } },
        evaluations: { select: { scores: true } },
        attachments: { select: { filename: true, url: true, size: true, mime: true } },
        events: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { actor: true, action: true, createdAt: true },
        },
      },
    });

    return Promise.all(rows.map(async (a) => {
      const p = (a.payload ?? {}) as Record<string, unknown>;
      const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
      const fio = str("nomineeFio") || a.contactFio || a.orgName;
      const [last = "", first = "", patr = ""] = fio.split(" ");
      const criteria = parseCriteria(a.nomination.criteria);
      const totals = a.evaluations.map((e) => calcTotal((e.scores ?? {}) as Record<string, number>, criteria));
      const score = calcAvgTotal(totals) !== null ? Math.round(calcAvgTotal(totals)!) : null;
      // средний балл по каждому критерию (для карточки — синхронизация с жюри)
      const avgByKey = new Map<string, number>();
      if (a.evaluations.length > 0) {
        for (const c of criteria) {
          const vals = a.evaluations.map((e) => Number(((e.scores ?? {}) as Record<string, number>)[c.key]) || 0);
          const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
          // округлить до шага
          const inv = 1 / c.step;
          avgByKey.set(c.key, Math.round(avg * inv) / inv);
        }
      }
      const attachments = await Promise.all(
        a.attachments.map(async (f) => ({
          filename: f.filename,
          url: await getDownloadUrl(f.url),
          size: f.size,
          mime: f.mime,
        })),
      );
      const schema = (a.nomination.formSchema ?? []) as {
        name: string;
        label: string;
        type: string;
      }[];
      const officialFields = schema
        .filter((f) => f.type !== "file")
        .map((f) => ({ label: f.label, value: str(f.name) }))
        .filter((f) => f.value.trim().length > 0);
      return {
        id: a.id,
        submittedAt: a.createdAt.toISOString(),
        status: DB_TO_MOCK[a.status],
        expertComment: a.expertComment ?? "",
        score,
        scores: criteria.map((c) => ({ label: c.label, max: c.maxScore, value: avgByKey.has(c.key) ? (avgByKey.get(c.key) as number) : null, step: c.step, weight: c.weight })),
        nomination: a.nominationId,
        nominationTitle: a.nomination.title,
        orgType: a.participantType,
        nominateSelf: str("nominateSelf"),
        howKnew: str("howKnew"),
        consentPersonal: true,
        consentTerms: true,
        consentNewsletter: p.consentNewsletter === true,
        nomLastName: last,
        nomFirstName: first,
        nomPatronymic: patr,
        nomNoPatronymic: !patr,
        nomGender: str("gender"),
        nomBirthDate: str("birthDate"),
        nomRegion: a.region,
        nomWorkplace: str("workplace") || a.inn,
        nomPosition: str("position") || a.position || "",
        descActivity: str("descActivity"),
        descScale: str("descScale"),
        coverageLevel: str("coverageLevel"),
        additionalInfo: str("additionalInfo"),
        links: (a.links ?? "").split("\n").filter(Boolean),
        attachments,
        officialFields,
        internalNote: a.internalNote ?? "",
        history: a.events.map((e) => ({
          ts: e.createdAt.toISOString(),
          user: e.actor,
          action: e.action,
        })),
      };
    }));
  }, [] as MockApp[]);

  const currentUser: AdminUser = {
    username: session.user.email ?? "",
    password: "",
    displayName: session.user.name ?? "Администратор",
    role: session.user.role === "superadmin" ? "superadmin" : "admin",
  };

  return <AdminApp initialApps={initialApps} currentUser={currentUser} />;
}
