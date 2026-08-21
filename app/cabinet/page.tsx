import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, safeDb } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CabinetTheme } from "@/components/cabinet-theme";
import { DeadlineTimer } from "@/components/deadline-timer";
import { NotificationBell } from "@/components/notification-bell";
import { ApplicationPipeline } from "@/components/application-pipeline";
import { ActivityTimeline } from "@/components/application-timeline";
import { DocumentVault } from "@/components/document-vault";
import { ApplicationComments } from "@/components/application-comments";
import { ParticipantProtocolLink } from "@/components/participant-protocol";
import type { AppStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Личный кабинет" };
export const dynamic = "force-dynamic";

const STATUS: Record<AppStatus, { label: string; color: string }> = {
  new: { label: "Отправлена", color: "#9a9aa4" },
  queued: { label: "Ожидает рассмотрения", color: "#7a86ff" },
  review: { label: "На рассмотрении", color: "#0804ff" },
  revision: { label: "Требует доработки", color: "#f97316" },
  scoring: { label: "На оценке жюри", color: "#a855f7" },
  finalist: { label: "Финалист", color: "#0804ff" },
  winner: { label: "Победитель", color: "#0804ff" },
  rejected: { label: "Отклонена", color: "#6a6a72" },
};

export default async function CabinetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const email = session.user.email ?? "";
  const userId = session.user.id;
  const userName = session.user.name || "Участник";

  const [apps, season, user, allEvents]: [any[], { endAt: Date } | null, any, any[]] = await safeDb(
    async () => {
      const a = await db.application.findMany({
        where: { email },
        include: {
          nomination: { select: { title: true } },
          attachments: { select: { id: true, filename: true, url: true, mime: true, size: true } },
          events: { orderBy: { createdAt: "desc" }, take: 10 },
          comments: { orderBy: { createdAt: "asc" } },
          evaluations: { select: { juryUserId: true, scores: true, comment: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const s = await db.season.findFirst({ where: { isActive: true }, select: { endAt: true } });
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { fio: true, phone: true, gender: true, birthDate: true, city: true, region: true },
      });
      return [a, s, u, []] as const;
    },
    [[] as any[], null, null, []],
  );

  const profileComplete = user && user.fio && user.phone && user.gender && user.birthDate && user.city && user.region;

  return (
    <CabinetTheme>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p
          style={{
            color: "var(--cab-faint)",
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            margin: 0,
          }}
        >
          Личный кабинет
        </p>
        <NotificationBell />
      </div>
      <h1 style={{ color: "var(--cab-text)", fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>
        Здравствуйте, {userName}!
      </h1>
      <p style={{ color: "var(--cab-muted)", fontSize: 14, margin: "0 0 24px" }}>
        Ваши заявки и их статусы. Одним аккаунтом можно подать заявки на разные
        номинации.
      </p>

      {season && <DeadlineTimer endAt={season.endAt.toISOString()} />}

      <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <a
          href="/apply"
          style={{
            background: "#0804ff",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          Подать заявку
        </a>
        <a
          href="/profile"
          style={{
            background: "var(--cab-surface)",
            color: "var(--cab-text)",
            border: "1px solid var(--cab-border)",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 999,
            padding: "12px 22px",
            textDecoration: "none",
          }}
        >
          Редактировать профиль
        </a>
      </div>

      {!profileComplete && (
        <div
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#f2f0ec", fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
              Профиль заполнен не полностью
            </p>
            <p style={{ color: "#9a9aa4", fontSize: 13, margin: 0 }}>
              Заполните все поля, чтобы подавать заявки на премию.
            </p>
          </div>
          <a
            href="/profile"
            style={{
              background: "rgba(249,115,22,0.15)",
              color: "#f97316",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 999,
              padding: "8px 16px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Заполнить →
          </a>
        </div>
      )}

      {apps.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--cab-border)",
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            background: "var(--cab-surface)",
          }}
        >
          <p style={{ color: "var(--cab-muted)", fontSize: 15, margin: "0 0 18px" }}>
            У вас пока нет заявок.
          </p>
          <a
            href="/apply"
            style={{
              background: "#0804ff",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 999,
              padding: "12px 22px",
              textDecoration: "none",
            }}
          >
            Подать первую заявку
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {apps.map((a) => {
            const st = STATUS[a.status as AppStatus];
            const nominee =
              (a.payload as { nomineeFio?: string } | null)?.nomineeFio || a.contactFio;
            const comments = (a.comments || []).map((c: any) => ({
              ...c,
              createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
            }));
            const events = (a.events || []).map((e: any) => ({
              ...e,
              createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
            }));
            const attachments = (a.attachments || []).map((att: any) => ({
              ...att,
            }));
            return (
              <div
                key={a.id}
                style={{
                  background: "var(--cab-surface)",
                  border: "1px solid var(--cab-border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <p
                      style={{
                        color: "var(--cab-text)",
                        fontSize: 16,
                        fontWeight: 600,
                        margin: "0 0 6px",
                        lineHeight: 1.35,
                      }}
                    >
                      {a.nomination.title}
                    </p>
                    <p style={{ color: "var(--cab-muted)", fontSize: 13, margin: "0 0 2px" }}>
                      Номинант: {nominee}
                    </p>
                    <p style={{ color: "var(--cab-faint)", fontSize: 12, margin: 0 }}>
                      Подана {a.createdAt.toLocaleDateString("ru-RU")} · № {a.id.slice(-6)}
                    </p>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      color: st.color,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      border: `1px solid ${st.color}55`,
                      borderRadius: 999,
                      padding: "6px 12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* Pipeline */}
                <ApplicationPipeline
                  status={a.status}
                  createdAt={a.createdAt.toISOString()}
                  updatedAt={a.updatedAt.toISOString()}
                />

                {/* Expert comment */}
                {a.expertComment && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "12px 14px",
                      background: "var(--cab-inset)",
                      borderLeft: "3px solid #0804ff",
                      borderRadius: "0 8px 8px 0",
                    }}
                  >
                    <p style={{ color: "var(--cab-text2)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>
                      Комментарий эксперта
                    </p>
                    <p style={{ color: "var(--cab-text2)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                      {a.expertComment}
                    </p>
                  </div>
                )}

                {/* Certificate */}
                {(a.status === "winner" || a.status === "finalist") && (
                  <a
                    href={`/certificate/${a.id}`}
                    style={{
                      display: "inline-block",
                      marginTop: 12,
                      background: "#0804ff",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: "9px 18px",
                      textDecoration: "none",
                      alignSelf: "flex-start",
                    }}
                  >
                    Скачать сертификат
                  </a>
                )}

                {/* Protocol download — available after first evaluation */}
                {a.evaluations && a.evaluations.length > 0 && (
                  <div style={{ marginTop: 12, alignSelf: "flex-start" }}>
                    <ParticipantProtocolLink
                      application={{
                        id: a.id,
                        status: a.status,
                        contactFio: a.contactFio,
                        orgName: a.orgName,
                        email: a.email,
                        phone: a.phone,
                        region: a.region,
                        createdAt: a.createdAt.toISOString(),
                        nominationTitle: a.nomination.title,
                        expertComment: a.expertComment || undefined,
                        evaluations: a.evaluations.map((ev: any) => ({
                          juryName: ev.juryUserId,
                          scores: ev.scores as Record<string, number>,
                          total: Object.values(ev.scores as Record<string, number>).reduce((sum: number, v: number) => sum + v, 0),
                          comment: ev.comment || undefined,
                        })),
                        events: (a.events || []).map((e: any) => ({
                          action: e.action,
                          createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : String(e.createdAt),
                        })),
                      }}
                    />
                  </div>
                )}

                {/* Activity Timeline */}
                {events.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--cab-border-soft)" }}>
                    <p style={{ color: "var(--cab-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px" }}>
                      История действий
                    </p>
                    <ActivityTimeline events={events} />
                  </div>
                )}

                {/* Document Vault */}
                {attachments.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cab-border-soft)" }}>
                    <p style={{ color: "var(--cab-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px" }}>
                      Документы ({attachments.length})
                    </p>
                    <DocumentVault attachments={attachments} />
                  </div>
                )}

                {/* Comments */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--cab-border-soft)" }}>
                  <p style={{ color: "var(--cab-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px" }}>
                    Обсуждение ({comments.length})
                  </p>
                  <ApplicationComments
                    comments={comments}
                    applicationId={a.id}
                    userRole="participant"
                    userName={userName}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Безопасность — смена пароля */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid var(--cab-border)" }}>
        <p
          style={{
            color: "var(--cab-faint)",
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            marginBottom: 14,
          }}
        >
          Безопасность
        </p>
        <ChangePasswordForm />
      </div>
    </CabinetTheme>
  );
}
