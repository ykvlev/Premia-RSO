"use client";

import { useState, useEffect } from "react";

const F = "var(--font-onest), sans-serif";
const C = { bg: "#08080a", card2: "#111117", border: "#1d1d25", text: "#f2f0ec", dim: "#6a6a72", muted: "#9a9aa4", accent: "#0804ff", green: "#2fbf6b" };

type DayData = { date: string; count: number };

const LEVELS = [0, 1, 3, 6, 10, 20];
const COLORS = ["#16161a", "#0e3a1e", "#1a6b3a", "#2fbf6b", "#2fbf6b99", "#2fbf6b44"];

function getLevel(count: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (count >= LEVELS[i]) return i;
  }
  return 0;
}

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

export function HeatmapCard({ data, title }: { data: DayData[]; title?: string }) {
  const [hovered, setHovered] = useState<DayData | null>(null);

  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  const today = new Date();
  const weeks: string[][] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const dayOfWeek = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOfWeek);

  let currentWeek: string[] = [];
  const d = new Date(start);
  while (d <= today) {
    currentWeek.push(d.toISOString().slice(0, 10));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalActions = data.reduce((s, d) => s + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;
  const maxDay = data.reduce((max, d) => d.count > max.count ? d : max, { date: "", count: 0 });

  const cellSize = 13;
  const gap = 3;

  return (
    <div style={{ fontFamily: F }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{totalActions} действий за год</span>
          <span style={{ color: C.dim, fontSize: 11, marginLeft: 12 }}>{activeDays} активных дней</span>
        </div>
        {maxDay.count > 0 && (
          <span style={{ color: C.green, fontSize: 11 }}>🔥 Пик: {maxDay.count} · {fmtDate(maxDay.date)}</span>
        )}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: gap }}>
          <div style={{ display: "flex", flexDirection: "column", gap: gap, marginRight: 4, paddingTop: 20 }}>
            {WEEKDAYS.map((wd, i) => (
              <span key={wd} style={{ fontSize: 9, color: C.dim, height: cellSize, display: "flex", alignItems: "center", visibility: i % 2 === 1 ? "visible" : "hidden" }}>{wd}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: gap }}>
              {week.map((date, di) => {
                const count = dataMap.get(date) ?? 0;
                const level = getLevel(count);
                const isFuture = date > today.toISOString().slice(0, 10);
                return (
                  <div
                    key={date}
                    onMouseEnter={() => setHovered({ date, count })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: cellSize, height: cellSize, borderRadius: 2,
                      background: isFuture ? "transparent" : COLORS[level],
                      border: hovered?.date === date ? `1px solid ${C.accent}` : "1px solid transparent",
                      cursor: count > 0 ? "pointer" : "default",
                      transition: "border-color 0.1s",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div style={{ display: "flex", gap: 2, marginTop: 6, marginLeft: 18 }}>
        {MONTHS.map((m, i) => (
          <span key={m} style={{ fontSize: 9, color: C.dim, width: weeks[0]?.length ? cellSize * 4 : 40 }}>{m}</span>
        ))}
      </div>

      {hovered && hovered.count > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
          {fmtDate(hovered.date)}: <span style={{ color: C.green, fontWeight: 600 }}>{hovered.count}</span> действий
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 9, color: C.dim }}>Мало</span>
        {COLORS.map((c, i) => (
          <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2, background: c, border: "1px solid transparent" }} />
        ))}
        <span style={{ fontSize: 9, color: C.dim }}>Много</span>
      </div>
    </div>
  );
}
