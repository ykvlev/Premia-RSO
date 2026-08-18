"use client";

import { useEffect, useState } from "react";
import { LogoutLink } from "./logout-link";

const F = "var(--font-onest), sans-serif";
const KEY = "cabinet-theme";

/** Обёртка кабинета с переключателем светлой/тёмной темы (запоминается). */
export function CabinetTheme({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <main
      data-cab-theme={theme}
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "var(--cab-bg)",
        color: "var(--cab-text)",
        fontFamily: F,
        transition: "background 0.2s, color 0.2s",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid var(--cab-border)",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable @next/next/no-img-element */}
          <img
            className="cab-logo-dark"
            src="/brand/logo/logo-white.svg"
            alt="Российские студенческие отряды"
            style={{ height: 30, width: "auto" }}
          />
          <img
            className="cab-logo-light"
            src="/brand/logo/logo-color.svg"
            alt="Российские студенческие отряды"
            style={{ height: 34, width: "auto" }}
          />
          {/* eslint-enable @next/next/no-img-element */}
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={toggle}
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            aria-label="Сменить тему"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid var(--cab-border)",
              background: "transparent",
              color: "var(--cab-text)",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <a
            href="/apply"
            style={{
              background: "#0804ff",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 999,
              padding: "9px 18px",
              textDecoration: "none",
            }}
          >
            Подать заявку
          </a>
          <LogoutLink />
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>
        {children}
      </div>
    </main>
  );
}
