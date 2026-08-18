import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { JuryManager, type JuryRow } from "@/components/admin/jury-manager";
import type { JuryPermissions } from "@/app/admin/jury-actions";

export const metadata: Metadata = { title: "Жюри" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

function normPerms(raw: unknown): JuryPermissions {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    score: o.score !== false, // по умолчанию можно оценивать
    comment: o.comment !== false,
    changeStatus: o.changeStatus === true,
    viewContacts: o.viewContacts === true,
    blindScoring: o.blindScoring === true,
  };
}

/** Управление жюри: создание профилей, номинации, права. */
export default async function AdminJuryPage() {
  await requireRole("admin", "superadmin");

  const [users, nominations] = await Promise.all([
    db.user.findMany({
      where: { role: "jury" },
      select: {
        id: true,
        fio: true,
        email: true,
        permissions: true,
        assignments: { select: { nominationId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.nomination.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const jury: JuryRow[] = users.map((u) => ({
    id: u.id,
    fio: u.fio,
    login: u.email,
    nominationIds: u.assignments.map((a) => a.nominationId),
    permissions: normPerms(u.permissions),
  }));

  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 28px 80px" }}>
        <h1 style={{ color: "#f2f0ec", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
          Управление жюри
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 28px" }}>
          Создайте профиль — логин и пароль сгенерируются автоматически. Затем назначьте
          видимые номинации и права на действия с заявками.
        </p>
        <JuryManager jury={jury} nominations={nominations} />
      </div>
    </main>
  );
}
