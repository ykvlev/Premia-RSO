"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

const F = "var(--font-onest), sans-serif";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className={className}
        disabled
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "#17171d",
          border: "1px solid #2a2a32",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "default",
          opacity: 0.5,
        }}
      >
        <Sun size={16} color="#6a6a72" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        background: isDark ? "#17171d" : "#f2f0ec",
        border: `1px solid ${isDark ? "#2a2a32" : "#d4d4d8"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        fontFamily: F,
      }}
    >
      {isDark ? (
        <Sun size={16} color="#f2f0ec" weight="bold" />
      ) : (
        <Moon size={16} color="#08080a" weight="bold" />
      )}
    </button>
  );
}
