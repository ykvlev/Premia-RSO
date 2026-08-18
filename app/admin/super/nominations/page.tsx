import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { NominationEditor, type NomData } from "@/components/admin/nomination-editor";

export const metadata: Metadata = { title: "Супер-админ · Номинации" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

/** Редактор номинаций и официальных полей заявки (formSchema). Только супер-админ. */
export default async function NominationsAdminPage() {
  await requireRole("superadmin");

  const season = await db.season.findFirst({ where: { isActive: true } });
  const rows = season
    ? await db.nomination.findMany({
        where: { seasonId: season.id },
        orderBy: { title: "asc" },
        select: { id: true, title: true, participantType: true, description: true, formSchema: true },
      })
    : [];

  const nominations: NomData[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    participantType: n.participantType,
    description: n.description ?? "",
    formSchema: Array.isArray(n.formSchema) ? (n.formSchema as NomData["formSchema"]) : [],
  }));

  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(8,8,10,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #22222a",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 16, fontWeight: 800, margin: 0 }}>Номинации и поля заявки</p>
          <p style={{ color: "#6a6a72", fontSize: 12, margin: "3px 0 0" }}>
            Меняй описания и официальные поля прямо здесь — без деплоя. Название номинации фиксировано.
          </p>
        </div>
        <Link
          href="/admin/super"
          style={{
            color: "#9a9aa4",
            fontSize: 12.5,
            fontFamily: F,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid #26262e",
            borderRadius: 8,
            padding: "8px 14px",
          }}
        >
          ← Панель системы
        </Link>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 80px" }}>
        {nominations.length === 0 ? (
          <p style={{ color: "#6a6a72", fontSize: 14, fontFamily: F }}>Активного сезона нет.</p>
        ) : (
          <NominationEditor nominations={nominations} />
        )}
      </div>
    </main>
  );
}
