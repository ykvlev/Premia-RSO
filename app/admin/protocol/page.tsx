import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";
import { PrintButton } from "@/components/certificate/print-button";

export const metadata: Metadata = { title: "Протокол итогов", robots: { index: false } };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

type Row = { fio: string; region: string; avg: number | null; winner: boolean };
type NomGroup = { title: string; rows: Row[] };

/** Печатный протокол подведения итогов (победители и финалисты по номинациям). */
export default async function ProtocolPage() {
  await requireRole("admin", "superadmin");

  const rows = await db.application.findMany({
    where: { status: { in: ["winner", "finalist"] } },
    include: {
      nomination: { select: { id: true, title: true } },
      evaluations: { select: { scores: true } },
    },
  });

  const byNom = new Map<string, NomGroup>();
  for (const a of rows) {
    if (!byNom.has(a.nomination.id)) {
      byNom.set(a.nomination.id, { title: a.nomination.title, rows: [] });
    }
    const totals = a.evaluations.map((e) => {
      const s = (e.scores ?? {}) as Record<string, number>;
      return Object.values(s).reduce((sum, v) => sum + (Number(v) || 0), 0);
    });
    const avg =
      totals.length > 0
        ? Math.round((totals.reduce((s, t) => s + t, 0) / totals.length) * 10) / 10
        : null;
    const p = (a.payload ?? {}) as Record<string, unknown>;
    const fio =
      (typeof p.nomineeFio === "string" && p.nomineeFio) || a.contactFio || a.orgName;
    byNom.get(a.nomination.id)!.rows.push({
      fio,
      region: a.region,
      avg,
      winner: a.status === "winner",
    });
  }

  const groups = [...byNom.values()]
    .map((g) => ({
      ...g,
      rows: g.rows.sort(
        (x, y) => Number(y.winner) - Number(x.winner) || (y.avg ?? -1) - (x.avg ?? -1),
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const today = new Date().toLocaleDateString("ru-RU");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0d0d12",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "28px 16px",
        fontFamily: F,
      }}
    >
      <style>{`
        @page { size: A4 portrait; margin: 18mm 16mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .doc { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div
        className="no-print"
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <PrintButton />
      </div>

      <div
        className="doc"
        style={{
          width: "min(96vw, 800px)",
          background: "#fff",
          color: "#111",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          padding: "48px 56px",
          boxSizing: "border-box",
        }}
      >
        {/* Шапка */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo/logo-color.svg"
            alt={brand.org}
            style={{ height: 46, width: "auto", marginBottom: 16 }}
          />
          <p style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px", letterSpacing: "0.02em" }}>
            ПРОТОКОЛ
          </p>
          <p style={{ fontSize: 14, color: "#333", margin: 0 }}>
            подведения итогов {brand.fullName}
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: "8px 0 0" }}>
            от {today}
          </p>
        </div>

        {groups.length === 0 ? (
          <p style={{ color: "#555", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
            Победители и финалисты пока не определены.
          </p>
        ) : (
          groups.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 22, breakInside: "avoid" }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0804ff",
                  margin: "0 0 8px",
                  borderBottom: "1px solid #e0e0e6",
                  paddingBottom: 6,
                }}
              >
                {gi + 1}. {g.title}
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {g.rows.map((r, ri) => (
                    <tr key={ri} style={{ borderBottom: "1px solid #f0f0f3" }}>
                      <td style={{ padding: "7px 8px 7px 0", width: 90, color: r.winner ? "#0804ff" : "#555", fontWeight: 700 }}>
                        {r.winner ? "Победитель" : "Финалист"}
                      </td>
                      <td style={{ padding: "7px 8px", fontWeight: 600 }}>{r.fio}</td>
                      <td style={{ padding: "7px 8px", color: "#666" }}>{r.region}</td>
                      <td style={{ padding: "7px 0", textAlign: "right", color: "#333", width: 70 }}>
                        {r.avg != null ? `${r.avg} б.` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Подписи */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48, gap: 40 }}>
          {["Председатель оргкомитета", "Секретарь"].map((role) => (
            <div key={role} style={{ flex: 1 }}>
              <div style={{ borderBottom: "1px solid #999", height: 28 }} />
              <p style={{ fontSize: 11, color: "#777", margin: "6px 0 0" }}>{role}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
