"use client";

const F = "var(--font-onest), sans-serif";

/** Кнопка «Сохранить в PDF» — вызывает системный диалог печати браузера. */
export function PrintButton() {
  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={{
        background: "#0804ff",
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: F,
        border: "none",
        borderRadius: 999,
        padding: "13px 28px",
        cursor: "pointer",
      }}
    >
      Сохранить в PDF / Распечатать
    </button>
  );
}
