"use client";

import { signOut } from "next-auth/react";

/** Кнопка выхода для кабинета участника. */
export function LogoutLink() {
  return (
    <button
      onClick={() => void signOut({ callbackUrl: "/login" })}
      style={{
        background: "transparent",
        border: "1px solid #2a2a32",
        color: "#9a9aa4",
        fontFamily: "var(--font-onest), sans-serif",
        fontSize: 13,
        borderRadius: 999,
        padding: "8px 16px",
        cursor: "pointer",
      }}
    >
      Выйти
    </button>
  );
}
