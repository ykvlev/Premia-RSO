"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 1080;
const F = "var(--font-onest), Arial, sans-serif";
// Canvas 2D не понимает CSS var() — для ctx.font нужен реальный стек шрифтов.
const CF = "Arial, Helvetica, sans-serif";
const PATTERN = ["#0804FF", "#FE4734", "#FE9633", "#4CACF7", "#6DC185", "#8043F9", "#00DFF2"];

/** Перенос строки по ширине; возвращает массив строк. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Шеринг-карточка с кирпичом: генерит картинку 1080×1080 для соцсетей
 * («Я подал заявку / финалист / победитель»). Скачивание + Web Share.
 */
export function ShareBrickCard({
  headline,
  nomination,
  brickSrc = "/brand/email/brick.jpg",
}: {
  headline: string;
  nomination?: string;
  brickSrc?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const render = (brick?: HTMLImageElement) => {
      // Фон
      ctx.fillStyle = "#08080a";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Верхняя подпись
      ctx.textAlign = "center";
      ctx.fillStyle = "#0804FF";
      ctx.font = `800 26px ${CF}`;
      ctx.fillText("НАЦИОНАЛЬНАЯ ПРЕМИЯ", SIZE / 2, 96);

      // Вордмарк
      ctx.fillStyle = "#f2f0ec";
      ctx.font = `900 86px ${CF}`;
      ctx.fillText("ТРУД КРУТ", SIZE / 2, 180);

      // Кирпич по центру
      if (brick && brick.width) {
        const w = 560;
        const h = (w * brick.height) / brick.width;
        ctx.drawImage(brick, (SIZE - w) / 2, 230, w, h);
      }

      // Хедлайн (крупно, может в 2 строки)
      ctx.fillStyle = "#f2f0ec";
      ctx.font = `900 78px ${CF}`;
      const hlLines = wrap(ctx, headline.toUpperCase(), SIZE - 160);
      let y = 790;
      for (const l of hlLines) {
        ctx.fillText(l, SIZE / 2, y);
        y += 88;
      }

      // Номинация
      if (nomination) {
        ctx.fillStyle = "#9a9aa4";
        ctx.font = `600 30px ${CF}`;
        const nomLines = wrap(ctx, nomination, SIZE - 220).slice(0, 2);
        y += 6;
        for (const l of nomLines) {
          ctx.fillText(l, SIZE / 2, y);
          y += 40;
        }
      }

      // Паттерн-лента снизу
      const bandY = SIZE - 96;
      const seg = (SIZE - 160) / PATTERN.length;
      PATTERN.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(80 + i * seg + 4, bandY, seg - 8, 10);
      });

      // Футер
      ctx.fillStyle = "#6a6a72";
      ctx.font = `600 26px ${CF}`;
      ctx.fillText("премиятрудкрут.рф · Российские студенческие отряды", SIZE / 2, SIZE - 48);

      setReady(true);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => render(img);
    img.onerror = () => render();
    img.src = brickSrc;
  }, [headline, nomination, brickSrc]);

  const download = useCallback(() => {
    ref.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trud-krut.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  const share = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "trud-krut.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Труд крут" });
        } catch {
          /* пользователь отменил */
        }
      } else {
        download();
      }
    }, "image/png");
  }, [download]);

  const btn: React.CSSProperties = {
    fontSize: 14,
    fontFamily: F,
    fontWeight: 600,
    borderRadius: 999,
    padding: "11px 22px",
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <canvas
        ref={ref}
        style={{
          width: "100%",
          maxWidth: 300,
          borderRadius: 14,
          border: "1px solid #22222a",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={download} style={{ ...btn, background: "#0804ff", color: "#fff", border: "none" }}>
          Скачать картинку
        </button>
        <button
          onClick={share}
          style={{ ...btn, background: "transparent", color: "#c8c8d0", border: "1px solid #2a2a32" }}
        >
          Поделиться
        </button>
      </div>
    </div>
  );
}
