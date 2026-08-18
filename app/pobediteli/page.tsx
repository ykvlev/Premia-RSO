import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Зал славы",
  description:
    "Финалисты и победители Национальной премии «Труд крут» — Российские студенческие отряды.",
};
export const revalidate = 120;

const F = "var(--font-onest), sans-serif";

const STATUS: Record<string, { label: string; color: string }> = {
  winner: { label: "Победитель", color: "#0804ff" },
  finalist: { label: "Финалист", color: "#8a88ff" },
};

/** Публичный «Зал славы» — финалисты и победители сезона. */
export default async function HallPage() {
  const rows = await db.application.findMany({
    where: { status: { in: ["winner", "finalist"] } },
    include: {
      nomination: { select: { title: true } },
      attachments: { take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
  // Победители — впереди финалистов.
  const apps = [...rows].sort(
    (a, b) => (a.status === "winner" ? 0 : 1) - (b.status === "winner" ? 0 : 1),
  );

  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}>
      {/* Шапка */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #2a2a32",
        }}
      >
        <a href="/" style={{ textDecoration: "none", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo/logo-white.svg"
            alt="Российские студенческие отряды"
            style={{ height: 34, width: "auto" }}
          />
        </a>
        <a
          href="/"
          style={{ color: "#9a9aa4", fontSize: 13, fontFamily: F, textDecoration: "none" }}
        >
          ← На сайт
        </a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(48px,7vw,88px) 24px 80px" }}>
        <p
          style={{
            color: "#8a88ff",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1.6px",
            marginBottom: 12,
          }}
        >
          Национальная премия «Труд крут»
        </p>
        <h1
          style={{
            color: "#f2f0ec",
            fontSize: "clamp(44px, 8vw, 88px)",
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            margin: "0 0 18px",
            textTransform: "uppercase",
          }}
        >
          Зал славы
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 16, lineHeight: 1.6, maxWidth: 560, margin: "0 0 48px" }}>
          Финалисты и победители премии — те, кто вложился, и страна это заметила.
        </p>

        {apps.length === 0 ? (
          <div
            style={{
              border: "1px solid #2a2a32",
              borderRadius: 20,
              padding: "60px 28px",
              textAlign: "center",
              background: "#121216",
            }}
          >
            <p style={{ color: "#f2f0ec", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>
              Победители будут объявлены после подведения итогов
            </p>
            <p style={{ color: "#9a9aa4", fontSize: 15, margin: "0 0 24px" }}>
              Следите за новостями премии. А пока — самое время подать заявку.
            </p>
            <a
              href="/apply"
              style={{
                display: "inline-block",
                background: "#0804ff",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 999,
                padding: "13px 26px",
                textDecoration: "none",
              }}
            >
              Подать заявку
            </a>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {apps.map((a) => {
              const st = STATUS[a.status] ?? STATUS.finalist;
              const name =
                (a.payload as { nomineeFio?: string } | null)?.nomineeFio || a.contactFio;
              const photo = a.attachments[0]?.url;
              return (
                <div
                  key={a.id}
                  style={{
                    background: "#121216",
                    border: "1px solid #2a2a32",
                    borderRadius: 16,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 3",
                      background: "#0f0f14",
                      overflow: "hidden",
                    }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/uploads/${photo}`}
                        alt={name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          filter: "grayscale(0.15)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#3a3a44",
                          fontSize: 40,
                          fontWeight: 800,
                        }}
                      >
                        {name.slice(0, 1)}
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        background: st.color,
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        borderRadius: 999,
                        padding: "5px 12px",
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div style={{ padding: "16px 18px 18px" }}>
                    <p
                      style={{ color: "#f2f0ec", fontSize: 17, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.25 }}
                    >
                      {name}
                    </p>
                    <p style={{ color: "#9a9aa4", fontSize: 13, lineHeight: 1.4, margin: "0 0 6px" }}>
                      {a.nomination.title}
                    </p>
                    {a.region && a.region !== "—" && (
                      <p style={{ color: "#6a6a72", fontSize: 12, margin: 0 }}>{a.region}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
