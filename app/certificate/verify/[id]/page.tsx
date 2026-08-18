import type { Metadata } from "next";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Проверка сертификата" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

const VERIFY: Record<string, { badge: string; line: string; color: string }> = {
  winner: { badge: "Победитель", line: "признан(а) победителем в номинации", color: "#2fbf6b" },
  finalist: { badge: "Финалист", line: "вышел(ла) в финал в номинации", color: "#4CACF7" },
};

/**
 * Публичная страница проверки подлинности сертификата (по QR-коду).
 * Без входа. Показывает только факт победы/финала — без контактов и ПДн.
 */
export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await db.application
    .findUnique({
      where: { id },
      select: {
        status: true,
        contactFio: true,
        orgName: true,
        createdAt: true,
        payload: true,
        nomination: { select: { title: true } },
      },
    })
    .catch(() => null);

  const info = app ? VERIFY[app.status] : undefined;
  const valid = !!app && !!info;

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "#08080a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: F,
  };

  if (!valid) {
    return (
      <main style={wrap}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
          <p style={{ color: "#f2f0ec", fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
            Сертификат не подтверждён
          </p>
          <p style={{ color: "#9a9aa4", fontSize: 15, lineHeight: 1.6 }}>
            По этому коду действующий сертификат победителя или финалиста премии «Труд крут»
            не найден.
          </p>
        </div>
      </main>
    );
  }

  const p = (app!.payload ?? {}) as Record<string, unknown>;
  const name =
    (typeof p.nomineeFio === "string" && p.nomineeFio) || app!.contactFio || app!.orgName;
  const year = app!.createdAt.getFullYear();

  return (
    <main style={wrap}>
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#0e0e12",
          border: "1px solid #22222a",
          borderRadius: 18,
          padding: "36px 30px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: info!.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            color: "#08080a",
            margin: "0 auto 18px",
          }}
        >
          ✓
        </div>
        <p
          style={{
            color: "#6a6a72",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Сертификат подтверждён
        </p>
        <p style={{ color: info!.color, fontSize: 15, fontWeight: 800, marginBottom: 18 }}>
          {info!.badge} · {brand.fullName}
        </p>

        <p style={{ color: "#9a9aa4", fontSize: 14 }}>настоящим удостоверяется, что</p>
        <p style={{ color: "#f2f0ec", fontSize: 26, fontWeight: 800, margin: "8px 0 12px" }}>
          {name}
        </p>
        <p style={{ color: "#9a9aa4", fontSize: 14 }}>{info!.line}</p>
        <p style={{ color: "#7b78ff", fontSize: 18, fontWeight: 700, margin: "6px 0 0", lineHeight: 1.3 }}>
          «{app!.nomination.title}»
        </p>

        <div style={{ height: 1, background: "#1e1e24", margin: "24px 0 16px" }} />
        <p style={{ color: "#6a6a72", fontSize: 12 }}>
          {year} · {brand.org} · премиятрудкрут.рф
        </p>
      </div>
    </main>
  );
}
