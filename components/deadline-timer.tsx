"use client";

import { useState, useEffect } from "react";

const F = "var(--font-onest), sans-serif";

/** Обратный отсчёт до закрытия приёма заявок. */
export function DeadlineTimer({ endAt }: { endAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds, expired: false };
    }

    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);

  if (!timeLeft || timeLeft.expired) {
    return (
      <div
        style={{
          background: "rgba(230,31,37,0.08)",
          border: "1px solid rgba(230,31,37,0.2)",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 8,
        }}
      >
        <p style={{ color: "#E61F25", fontSize: 14, fontFamily: F, fontWeight: 600, margin: 0 }}>
          Приём заявок завершён
        </p>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        background: "var(--cab-surface)",
        border: "1px solid var(--cab-border)",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 8,
      }}
    >
      <p style={{ color: "var(--cab-muted)", fontSize: 13, fontFamily: F, margin: "0 0 8px" }}>
        До закрытия приёма заявок:
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { val: timeLeft.days, label: "дн" },
          { val: timeLeft.hours, label: "ч" },
          { val: timeLeft.minutes, label: "мин" },
          { val: timeLeft.seconds, label: "сек" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--cab-inset)",
              border: "1px solid var(--cab-border)",
              borderRadius: 8,
              padding: "8px 12px",
              textAlign: "center",
              minWidth: 56,
            }}
          >
            <div
              style={{
                color: "#0804ff",
                fontSize: 22,
                fontFamily: F,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {pad(item.val)}
            </div>
            <div
              style={{
                color: "var(--cab-faint)",
                fontSize: 10,
                fontFamily: F,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginTop: 4,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
