"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Дашборд", exact: true },
  { href: "/admin/applications", label: "Заявки", exact: false },
  { href: "/admin/assignments", label: "Жюри", exact: false },
];

/** Навигация админки: плоские табы с активным подчёркиванием. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`border px-4 py-2 text-sm ${
              active
                ? "border-black bg-black text-white"
                : "border-transparent hover:border-black"
            }`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
