import type { Metadata } from "next";

export const metadata: Metadata = { title: "Сайт временно недоступен" };

const F = "var(--font-onest), sans-serif";

export default function MaintenancePage() {
  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        background: "#08080a",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(680px circle at 50% -10%, rgba(255,68,68,0.06), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", textAlign: "center", maxWidth: 440 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255,68,68,0.1)",
            border: "2px solid rgba(255,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 28,
          }}
        >
          ⚠
        </div>
        <h1
          style={{
            color: "#f2f0ec",
            fontSize: 28,
            fontFamily: F,
            fontWeight: 800,
            margin: "0 0 12px",
          }}
        >
          Сайт временно недоступен
        </h1>
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 15,
            fontFamily: F,
            lineHeight: 1.6,
            margin: "0 0 12px",
          }}
        >
          Проводятся технические работы. Попробуйте вернуться через несколько минут.
        </p>
        <p
          style={{
            color: "#6a6a72",
            fontSize: 13,
            fontFamily: F,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Если проблема сохраняется, свяжитесь с организаторами премии.
        </p>
      </div>
    </main>
  );
}
