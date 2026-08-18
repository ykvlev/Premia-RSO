import type { ReactNode } from "react";

const F = "var(--font-onest), sans-serif";

/** Инлайн-разметка: **жирный**. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} style={{ color: "#f2f0ec", fontWeight: 700 }}>
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** Мини-рендерер Markdown (заголовки, абзацы, списки, hr, жирный). */
function render(md: string): ReactNode[] {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      <ul
        key={`ul${out.length}`}
        style={{ margin: "0 0 14px", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {list.map((li, i) => (
          <li key={i} style={{ color: "#c8c8d0", fontSize: 15, lineHeight: 1.6 }}>
            {inline(li)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("### ")) {
      flush();
      out.push(
        <h3 key={out.length} style={{ color: "#f2f0ec", fontSize: 18, fontWeight: 700, margin: "24px 0 10px" }}>
          {inline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flush();
      out.push(
        <h2 key={out.length} style={{ color: "#f2f0ec", fontSize: 22, fontWeight: 800, margin: "34px 0 12px" }}>
          {inline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flush();
      out.push(
        <h1 key={out.length} style={{ color: "#f2f0ec", fontSize: 30, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.2 }}>
          {inline(line.slice(2))}
        </h1>,
      );
    } else if (line.trim() === "---") {
      flush();
      out.push(<hr key={out.length} style={{ border: 0, borderTop: "1px solid #2a2a32", margin: "24px 0" }} />);
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      out.push(
        <p key={out.length} style={{ color: "#c8c8d0", fontSize: 15, lineHeight: 1.65, margin: "0 0 14px" }}>
          {inline(line)}
        </p>,
      );
    }
  }
  flush();
  return out;
}

/** Полная тёмная страница юридического документа. */
export function LegalPage({ md }: { md: string }) {
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/">
          <img
            src="/brand/logo/logo-white.svg"
            alt="Российские студенческие отряды"
            style={{ height: 30, width: "auto" }}
          />
        </a>
        <a
          href="/"
          style={{
            color: "#9a9aa4",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid #2a2a32",
            borderRadius: 7,
            padding: "7px 14px",
          }}
        >
          ← На главную
        </a>
      </header>
      <article style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 96px" }}>
        {render(md)}
      </article>
    </main>
  );
}
