import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08080a",
        color: "#f2f0ec",
        fontFamily: "var(--font-onest), system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
        <p
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#0804ff",
            lineHeight: 1,
            margin: "0 0 8px",
            fontFamily: "var(--font-heading), system-ui",
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 8px",
          }}
        >
          Страница не найдена
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 24px" }}>
          Похоже, этой страницы не существует или она была перемещена.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/"
            style={{
              background: "#0804ff",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            На главную
          </Link>
          <Link
            href="/apply"
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
            Подать заявку
          </Link>
        </div>
      </div>
    </main>
  );
}
