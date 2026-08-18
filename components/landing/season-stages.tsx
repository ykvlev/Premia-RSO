"use client";

const F = "var(--font-onest), sans-serif";
const BLUE = "#0804FF";

export type Stage = { key: string; label: string; note?: string };

const DEFAULT_STAGES: Stage[] = [
  { key: "apply", label: "Приём заявок", note: "до 31 окт" },
  { key: "expert", label: "Экспертиза", note: "ноябрь" },
  { key: "jury", label: "Оценка жюри", note: "ноябрь" },
  { key: "final", label: "Финал", note: "декабрь" },
  { key: "ceremony", label: "Церемония", note: "декабрь" },
];

/**
 * Прогресс сезона премии: горизонтальный степпер этапов.
 * `current` — индекс текущего этапа (0..n-1); пройденные подсвечены.
 */
export function SeasonStages({
  stages = DEFAULT_STAGES,
  current = 0,
}: {
  stages?: Stage[];
  current?: number;
}) {
  return (
    <div style={{ width: "100%", maxWidth: 920, fontFamily: F }}>
      <p
        style={{
          color: "#6a6a72",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        Этапы сезона 2026
      </p>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {stages.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const dot = done || active ? BLUE : "#22222a";
          return (
            <div key={s.key} style={{ flex: 1, position: "relative", textAlign: "center" }}>
              {/* линия к следующему */}
              {i < stages.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 11,
                    left: "50%",
                    right: "-50%",
                    height: 2,
                    background: i < current ? BLUE : "#22222a",
                  }}
                />
              )}
              {/* точка */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  margin: "0 auto",
                  background: dot,
                  boxShadow: active ? `0 0 0 6px ${BLUE}22` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 12,
                }}
              >
                {done ? "✓" : ""}
              </div>
              <p
                style={{
                  color: done || active ? "#f2f0ec" : "#8a8a92",
                  fontSize: 13.5,
                  fontWeight: active ? 800 : 600,
                  margin: "12px 6px 2px",
                }}
              >
                {s.label}
              </p>
              {s.note && (
                <p style={{ color: active ? "#7b78ff" : "#6a6a72", fontSize: 11.5, margin: 0 }}>
                  {s.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
