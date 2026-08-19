import Link from "next/link";

const F = "var(--font-onest), sans-serif";

export default function NotFound() {
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
            "radial-gradient(680px circle at 50% -10%, rgba(8,4,255,0.08), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", textAlign: "center", maxWidth: 440 }}>
        <p
          style={{
            fontSize: 120,
            fontWeight: 900,
            fontFamily: F,
            color: "#0804ff",
            lineHeight: 1,
            margin: "0 0 8px",
            opacity: 0.15,
          }}
        >
          404
        </p>
        <h1
          style={{
            color: "#f2f0ec",
            fontSize: 28,
            fontFamily: F,
            fontWeight: 800,
            margin: "0 0 12px",
            marginTop: -30,
          }}
        >
          Страница не найдена
        </h1>
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 15,
            fontFamily: F,
            lineHeight: 1.5,
            margin: "0 0 28px",
          }}
        >
          Возможно, она была перемещена или ссылка устарела.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#0804ff",
            color: "#fff",
            fontSize: 15,
            fontFamily: F,
            fontWeight: 600,
            borderRadius: 999,
            padding: "14px 28px",
            textDecoration: "none",
            transition: "background 0.15s",
          }}
        >
          На главную →
        </Link>
      </div>
    </main>
  );
}
