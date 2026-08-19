"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080a",
          color: "#f2f0ec",
          fontFamily: "var(--font-onest), system-ui, sans-serif",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#0804ff",
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            Критическая ошибка
          </h1>
          <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 24px" }}>
            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
          </p>
          {error.digest && (
            <p style={{ color: "#6a6a72", fontSize: 11, margin: "0 0 16px" }}>
              Код ошибки: {error.digest}
            </p>
          )}
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
      </body>
    </html>
  );
}
