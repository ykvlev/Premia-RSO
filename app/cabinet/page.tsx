import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, safeDb } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CabinetTheme } from "@/components/cabinet-theme";
import { DeadlineTimer } from "@/components/deadline-timer";
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

/** Этапы движения заявки для визуального прогресса (линейный «счастливый путь»). */
const FLOW: { key: AppStatus; label: string }[] = [
  { key: "new", label: "Отправлена" },
  { key: "queued", label: "Ожидает" },
  { key: "review", label: "Рассмотрение" },
  { key: "scoring", label: "Оценка жюри" },
  { key: "finalist", label: "Финал" },
  { key: "winner", label: "Победа" },
];

/** Горизонтальный степпер прогресса заявки. */
function Stepper({ status }: { status: AppStatus }) {
  if (status === "rejected") {
    return (
      <div
        style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "var(--cab-rej-bg)",
          border: "1px solid var(--cab-rej-bd)",
          borderRadius: 8,
          color: "var(--cab-rej-tx)",
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        Заявка отклонена. Спасибо за участие — вы можете подать заявку на другую
        номинацию.
      </div>
    );
  }
  if (status === "revision") {
    return (
      <div
        style={{
          marginTop: 14,
          padding: "10px 14px",
          background: "var(--cab-warn-bg)",
          border: "1px solid var(--cab-warn-bd)",
          borderRadius: 8,
          color: "var(--cab-warn-tx)",
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        Заявка требует доработки. Ознакомьтесь с комментарием эксперта ниже и при
        необходимости свяжитесь с оргкомитетом.
      </div>
    );
  }
  const current = FLOW.findIndex((f) => f.key === status);
  return (
    <div
      style={{
        marginTop: 18,
        paddingTop: 16,
        borderTop: "1px solid var(--cab-border-soft)",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {FLOW.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <div
            key={step.key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}
          >
            {i < FLOW.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 7,
                  left: "50%",
                  right: "-50%",
                  height: 2,
                  background: i < current ? "#0804ff" : "var(--cab-border)",
                }}
              />
            )}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: done ? "#0804ff" : "var(--cab-surface2)",
                border: `2px solid ${done ? "#0804ff" : "var(--cab-border)"}`,
                zIndex: 1,
                boxShadow: isCurrent ? "0 0 0 4px #0804ff22" : "none",
              }}
            />
            <span
              style={{
                marginTop: 8,
                fontSize: 10.5,
                fontWeight: isCurrent ? 700 : 500,
                color: done ? "var(--cab-text2)" : "var(--cab-faint)",
                textAlign: "center",
                lineHeight: 1.3,
                letterSpacing: "0.2px",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Личный кабинет участника: все его заявки (по email аккаунта). */
export default async function CabinetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const email = session.user.email ?? "";
  const userId = session.user.id;

  const [apps, season, user]: [any[], { endAt: Date } | null, any] = await safeDb(
    async () => {
      const a = await db.application.findMany({
        where: { email },
        include: { nomination: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      });
      const s = await db.season.findFirst({ where: { isActive: true }, select: { endAt: true } });
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { fio: true, phone: true, gender: true, birthDate: true, city: true, region: true },
      });
      return [a, s, u] as const;
    },
    [[] as any[], null, null],
  );

  const profileComplete = user && user.fio && user.phone && user.gender && user.birthDate && user.city && user.region;

  return (
    <CabinetTheme>
      <p
        style={{
          color: "var(--cab-faint)",
          fontSize: 12,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          marginBottom: 8,
        }}
      >
        Личный кабинет
      </p>
      <h1 style={{ color: "var(--cab-text)", fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>
        Здравствуйте, {session.user.name || "участник"}!
      </h1>
      <p style={{ color: "var(--cab-muted)", fontSize: 14, margin: "0 0 24px" }}>
        Ваши заявки и их статусы. Одним аккаунтом можно подать заявки на разные
        номинации.
      </p>

      {/* Таймер до закрытия приёма заявок */}
      {season && <DeadlineTimer endAt={season.endAt.toISOString()} />}

      {/* Кнопки навигации */}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {apps.map((a) => {
            const st = STATUS[a.status as AppStatus];
            const nominee =
              (a.payload as { nomineeFio?: string } | null)?.nomineeFio || a.contactFio;
            return (
              <div
                key={a.id}
                className="hover-card"
                style={{
                  background: "var(--cab-surface)",
                  border: "1px solid var(--cab-border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
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
                      Подана {a.createdAt.toLocaleDateString("ru-RU")} · №{" "}
                      {a.id.slice(-6)}
                    </p>
                    {a.expertComment && (
                      <p
                        style={{
                          color: "var(--cab-text2)",
                          fontSize: 13,
                          margin: "10px 0 0",
                          padding: "10px 12px",
                          background: "var(--cab-inset)",
                          borderLeft: "2px solid #0804ff",
                          borderRadius: 6,
                          lineHeight: 1.5,
                        }}
                      >
                        Комментарий эксперта: {a.expertComment}
                      </p>
                    )}
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
                        }}
                      >
                        Скачать сертификат
                      </a>
                    )}
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
                <Stepper status={a.status} />
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
