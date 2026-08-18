"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

/**
 * Оболочка админки: на под-страницах (Жюри/Рейтинг/Протокол/Рассылка)
 * рендерит общий сайдбар слева. Сам «/admin» и «/admin/super» имеют
 * собственные полноэкранные каркасы — там сайдбар не дублируем.
 */
export function AdminLayoutShell({
  displayName,
  role,
  appsCount,
  newCount,
  children,
}: {
  displayName: string;
  role: string;
  appsCount: number;
  newCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const standalone = pathname === "/admin" || pathname.startsWith("/admin/super");

  if (standalone) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08080a",
        display: "grid",
        gridTemplateColumns: "236px 1fr",
        fontFamily: "var(--font-onest), sans-serif",
      }}
    >
      <AdminSidebar
        displayName={displayName}
        role={role}
        appsCount={appsCount}
        newCount={newCount}
      />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
