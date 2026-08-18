import type { Metadata } from "next";
import { StatusCheck } from "@/components/status-check";

export const metadata: Metadata = {
  title: "Проверить статус заявки",
  description:
    "Проверьте статус вашей заявки на Национальную премию «Труд крут» по номеру и email — без входа в кабинет.",
};

const F = "var(--font-onest), sans-serif";

/** Публичная проверка статуса заявки без входа. */
export default function StatusPage() {
  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #2a2a32",
        }}
      >
        <a href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo/logo-white.svg"
            alt="Российские студенческие отряды"
            style={{ height: 30, width: "auto" }}
          />
        </a>
        <a
          href="/login"
          style={{
            color: "#9a9aa4",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid #2a2a32",
            borderRadius: 999,
            padding: "9px 18px",
          }}
        >
          Войти в кабинет
        </a>
      </header>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "56px 24px 80px" }}>
        <h1 style={{ color: "#f2f0ec", fontSize: 30, fontWeight: 800, margin: "0 0 8px" }}>
          Проверить статус заявки
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 15, margin: "0 0 32px", lineHeight: 1.6 }}>
          Введите номер заявки (последние символы номера из письма или кабинета) и email,
          который вы указывали. Вход не требуется.
        </p>
        <StatusCheck />
      </div>
    </main>
  );
}
