"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08080a",
        color: "#f2f0ec",
        fontFamily: "var(--font-onest), system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#0804ff",
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          !
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
          Ошибка загрузки
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 20px" }}>
          Кабинет жюри временно недоступен.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "#0804ff",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            style={{
              background: "transparent",
              color: "#9a9aa4",
              border: "1px solid #2a2a32",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
