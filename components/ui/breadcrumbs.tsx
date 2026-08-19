"use client";

import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  cabinet: "Личный кабинет",
  profile: "Профиль",
  apply: "Подать заявку",
  login: "Вход",
  register: "Регистрация",
  admin: "Админ",
  jury: "Жюри",
  nominations: "Номинации",
  "forgot-password": "Сброс пароля",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const F = "var(--font-onest), sans-serif";

  return (
    <nav
      aria-label="Навигация"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: F,
        fontSize: 13,
        color: "#6a6a72",
        marginBottom: 20,
        flexWrap: "wrap",
      }}
    >
      <a
        href="/"
        style={{
          color: "#6a6a72",
          textDecoration: "none",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#f2f0ec")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a72")}
      >
        Главная
      </a>
      {segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = labels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
        return (
          <span key={path} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#3a3a44" }}>/</span>
            {isLast ? (
              <span style={{ color: "#f2f0ec", fontWeight: 600 }}>{label}</span>
            ) : (
              <a
                href={path}
                style={{
                  color: "#6a6a72",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f2f0ec")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a72")}
              >
                {label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
