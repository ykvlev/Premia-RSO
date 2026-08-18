import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";
import { PrintButton } from "@/components/certificate/print-button";
import QRCode from "qrcode";

export const metadata: Metadata = { title: "Сертификат", robots: { index: false } };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";
const H = "var(--font-actay), var(--font-onest), sans-serif";

const CERT: Record<string, { badge: string; line: string }> = {
  winner: { badge: "Победитель", line: "признан(а) победителем в номинации" },
  finalist: { badge: "Финалист", line: "вышел(ла) в финал в номинации" },
};

/** Печатный сертификат победителя/финалиста. Доступ: владелец заявки или оргкомитет. */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const app = await db.application.findUnique({
    where: { id },
    include: { nomination: { select: { title: true } } },
  });
  if (!app) notFound();

  const role = session.user.role;
  const isStaff = role === "admin" || role === "superadmin" || role === "jury";
  const isOwner =
    !!session.user.email &&
    session.user.email.toLowerCase() === app.email.toLowerCase();
  if (!isStaff && !isOwner) notFound();

  const cert = CERT[app.status];
  if (!cert) {
    // Сертификат выдаётся только финалистам и победителям.
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#08080a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: F,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <p style={{ color: "#f2f0ec", fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            Сертификат пока недоступен
          </p>
          <p style={{ color: "#9a9aa4", fontSize: 14, lineHeight: 1.6 }}>
            Именной сертификат формируется для финалистов и победителей премии после
            подведения итогов.
          </p>
        </div>
      </main>
    );
  }

  const p = (app.payload ?? {}) as Record<string, unknown>;
  const name =
    (typeof p.nomineeFio === "string" && p.nomineeFio) || app.contactFio || app.orgName;
  const year = app.createdAt.getFullYear();

  // QR со ссылкой на публичную проверку подлинности сертификата.
  const site = (process.env.NEXTAUTH_URL || "https://премиятрудкрут.рф").replace(/\/+$/, "");
  const verifyUrl = `${site}/certificate/verify/${id}`;
  const qr = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 220,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  }).catch(() => "");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d12",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        padding: "32px 16px",
        fontFamily: F,
      }}
    >
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .cert-shell { margin: 0 !important; }
          .cert-sheet { box-shadow: none !important; }
        }
      `}</style>

      {/* Лист сертификата — пропорции A4 альбом (297×210) */}
      <div
        className="cert-sheet"
        style={{
          width: "min(96vw, 1050px)",
          aspectRatio: "297 / 210",
          background: "#ffffff",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "6% 8%",
          boxSizing: "border-box",
        }}
      >
        {/* Рамка */}
        <div
          style={{
            position: "absolute",
            inset: "3.2%",
            border: "2px solid #0804ff",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "4.4%",
            border: "1px solid #0804ff44",
            pointerEvents: "none",
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo/logo-color.svg"
          alt={brand.org}
          style={{ height: "8%", width: "auto", marginBottom: "2.5%" }}
        />

        <p
          style={{
            color: "#0804ff",
            fontFamily: H,
            fontSize: "clamp(28px, 5.2vw, 58px)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            margin: 0,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          Сертификат
        </p>
        <p
          style={{
            color: "#111",
            fontSize: "clamp(12px, 1.5vw, 17px)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            margin: "1.4% 0 3%",
            textAlign: "center",
          }}
        >
          {cert.badge} · {brand.fullName}
        </p>

        <p style={{ color: "#555", fontSize: "clamp(12px, 1.5vw, 17px)", margin: 0 }}>
          настоящим удостоверяется, что
        </p>

        <p
          style={{
            color: "#0a0a0a",
            fontSize: "clamp(24px, 3.8vw, 44px)",
            fontWeight: 800,
            margin: "1.6% 0",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {name}
        </p>

        <p
          style={{
            color: "#555",
            fontSize: "clamp(12px, 1.6vw, 18px)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {cert.line}
        </p>
        <p
          style={{
            color: "#0804ff",
            fontSize: "clamp(15px, 2.1vw, 24px)",
            fontWeight: 700,
            margin: "0.8% 0 0",
            textAlign: "center",
            maxWidth: "80%",
            lineHeight: 1.25,
          }}
        >
          «{app.nomination.title}»
        </p>

        {/* Низ: год + подпись */}
        <div
          style={{
            position: "absolute",
            left: "9%",
            right: "9%",
            bottom: "8%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <p style={{ color: "#0a0a0a", fontWeight: 700, fontSize: "clamp(13px,1.6vw,19px)", margin: 0 }}>
              {year}
            </p>
            <p style={{ color: "#777", fontSize: "clamp(9px,1vw,12px)", margin: "2px 0 0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              год
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ width: "clamp(120px, 16vw, 200px)", borderTop: "1px solid #999", marginLeft: "auto" }} />
            <p style={{ color: "#777", fontSize: "clamp(9px,1vw,12px)", margin: "6px 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Оргкомитет · {brand.orgShort}
            </p>
          </div>
        </div>

        {/* QR проверки подлинности (центр-низ листа) */}
        {qr && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "6%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR проверки подлинности сертификата"
              style={{ width: "clamp(54px, 7vw, 82px)", height: "auto", display: "block" }}
            />
            <p
              style={{
                color: "#999",
                fontSize: "clamp(7px, 0.82vw, 10px)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Проверка подлинности
            </p>
          </div>
        )}
      </div>

      <div className="no-print" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <PrintButton />
        <a
          href="/cabinet"
          style={{
            color: "#9a9aa4",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid #2a2a32",
            borderRadius: 999,
            padding: "12px 22px",
          }}
        >
          ← В кабинет
        </a>
      </div>
    </main>
  );
}
