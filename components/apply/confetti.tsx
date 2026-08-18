"use client";

import { useEffect, useRef } from "react";

// Фирменные цвета РСО для конфетти.
const COLORS = ["#0804FF", "#FE4734", "#FE9633", "#4CACF7", "#6DC185", "#8043F9", "#00DFF2", "#FFFFFF"];

/** Одноразовое конфетти (canvas, без зависимостей). Играет `duration` мс и гаснет. */
export function Confetti({ duration = 3800 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();

    const parts = Array.from({ length: 170 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height * 0.4,
      w: (6 + Math.random() * 9) * dpr,
      h: (9 + Math.random() * 12) * dpr,
      vx: (Math.random() - 0.5) * 3 * dpr,
      vy: (2.5 + Math.random() * 4.5) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    }));

    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > duration - 900 ? Math.max(0, (duration - elapsed) / 900) : 1;
      ctx.globalAlpha = fade;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03 * dpr;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (elapsed < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60 }}
    />
  );
}
