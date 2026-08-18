import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const dynamic = "force-dynamic";

/**
 * Каркас админ-панели: серверная проверка прав + общий сайдбар на под-страницах
 * (через AdminLayoutShell). «/admin» и «/admin/super» — со своими каркасами.
 * Для супер-админа — плавающая ссылка на системную панель.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin", "superadmin");
  const isSuper = session.user.role === "superadmin";

  const [appsCount, newCount] = await Promise.all([
    db.application.count(),
    db.application.count({ where: { status: "new" } }),
  ]);

  return (
    <div className="min-h-full flex-1">
      <AdminLayoutShell
        displayName={session.user.name ?? "Администратор"}
        role={session.user.role}
        appsCount={appsCount}
        newCount={newCount}
      >
        {children}
      </AdminLayoutShell>
      {isSuper && (
        <Link
          href="/admin/super"
          title="Системная панель супер-админа"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#0e0e12",
            color: "#f2f0ec",
            border: "1px solid #2b4cff66",
            borderRadius: 999,
            padding: "10px 16px",
            fontFamily: "var(--font-onest), sans-serif",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#2fbf6b",
              boxShadow: "0 0 8px #2fbf6b88",
            }}
          />
          Система
        </Link>
      )}
    </div>
  );
}
