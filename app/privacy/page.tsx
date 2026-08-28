import type { Metadata } from "next";

export const metadata: Metadata = { title: "Пользовательское соглашение" };

export default function PrivacyPage() {
  const pdfUrl = "/legal/privacy";

  return (
    <main style={{ minHeight: "100vh", background: "#08080a", color: "#f2f0ec", fontFamily: "var(--font-onest), sans-serif" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 24px",
          borderBottom: "1px solid #2a2a32",
        }}
      >
        <a href="/" style={{ color: "#f2f0ec", textDecoration: "none", fontWeight: 700 }}>
          Труд крут
        </a>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            color: "#d4d4d8",
            textDecoration: "none",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            padding: "8px 14px",
          }}
        >
          Открыть PDF
        </a>
      </header>

      <div style={{ padding: "20px 16px 40px" }}>
        <object data={pdfUrl} type="application/pdf" style={{ width: "100%", height: "calc(100vh - 110px)", border: "none", background: "#0e0e12" }}>
          <iframe src={pdfUrl} style={{ width: "100%", height: "calc(100vh - 110px)", border: "none" }} title="Пользовательское соглашение" />
        </object>
      </div>
    </main>
  );
}
