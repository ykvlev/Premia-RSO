import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Открытка участника",
  description: "Расскажи, что участвуешь в Национальной премии «Труд крут».",
};

const F = "var(--font-onest), sans-serif";
const A = "var(--font-actay), var(--font-onest), sans-serif";
const SITE = "https://премиятрудкрут.рф";
const SHARE_TITLE = "Я участвую в Национальной премии «Труд крут»! Присоединяйся 👉";

/** Шаринговая «открытка участника» — для сторис/соцсетей. */
export default function OtkrytkaPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08080a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        padding: "40px 20px 80px",
        fontFamily: F,
      }}
    >
      {/* Карточка (квадрат под сторис) */}
      <div
        style={{
          width: "min(92vw, 440px)",
          aspectRatio: "1 / 1",
          background: "linear-gradient(150deg, #0804ff 0%, #0602b0 100%)",
          borderRadius: 28,
          padding: "40px 34px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 30px 80px rgba(8,4,255,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo/logo-white.svg"
          alt="Российские студенческие отряды"
          style={{ height: 34, width: "auto" }}
        />
        <div>
          <p style={{ color: "#c9c6ff", fontSize: 15, fontWeight: 600, margin: "0 0 10px", letterSpacing: "0.04em" }}>
            Я участвую в
          </p>
          <p style={{ color: "#fff", fontFamily: A, fontSize: "clamp(40px, 12vw, 68px)", fontWeight: 700, margin: 0, lineHeight: 0.95, textTransform: "uppercase" }}>
            Труд<br />Крут
          </p>
          <p style={{ color: "#d5d3ff", fontSize: 14, margin: "14px 0 0", lineHeight: 1.4 }}>
            Национальная премия Российских студенческих отрядов
          </p>
        </div>
        <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>
          премиятрудкрут.рф
        </p>
      </div>

      <p style={{ color: "#9a9aa4", fontSize: 14, textAlign: "center", maxWidth: 440, lineHeight: 1.5 }}>
        Сделай скриншот карточки и выложи в сторис — или поделись ссылкой на премию.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href={`https://vk.com/share.php?url=${encodeURIComponent(SITE)}&title=${encodeURIComponent(SHARE_TITLE)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#0077FF",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: F,
            borderRadius: 999,
            padding: "12px 24px",
            textDecoration: "none",
          }}
        >
          Поделиться ВКонтакте
        </a>
        <a
          href="/apply"
          style={{
            background: "transparent",
            color: "#f2f0ec",
            border: "1px solid #2a2a32",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: F,
            borderRadius: 999,
            padding: "12px 24px",
            textDecoration: "none",
          }}
        >
          Подать заявку
        </a>
      </div>
    </main>
  );
}
