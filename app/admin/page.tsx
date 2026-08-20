import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db, safeDb } from "@/lib/db";
import { getDownloadUrl } from "@/lib/storage";
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
      const crit = (a.nomination.criteria ?? []) as { label: string; maxScore?: number }[];
      const totals = a.evaluations.map((e) => {
        const s = (e.scores ?? {}) as Record<string, number>;
        return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
      });
      const score =
        totals.length > 0
          ? Math.round(totals.reduce((s, t) => s + t, 0) / totals.length)
          : null;
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
        scores: crit.map((c) => ({ label: c.label, max: c.maxScore ?? 100, value: null })),
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
