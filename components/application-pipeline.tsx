"use client";

const F = "var(--font-onest), sans-serif";

const STAGES = [
  { key: "new", label: "Отправлена", icon: "📨" },
  { key: "queued", label: "Ожидает", icon: "⏳" },
  { key: "review", label: "Рассмотрение", icon: "🔍" },
  { key: "scoring", label: "Оценка жюри", icon: "⚖️" },
  { key: "finalist", label: "Финалист", icon: "⭐" },
  { key: "winner", label: "Победитель", icon: "🏆" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "#9a9aa4",
  queued: "#7a86ff",
  review: "#0804ff",
  revision: "#f97316",
  scoring: "#a855f7",
  finalist: "#0804ff",
  winner: "#2fbf6b",
  rejected: "#6a6a72",
};

export function ApplicationPipeline({
  status,
  createdAt,
  updatedAt,
}: {
  status: string;
  createdAt: string;
  updatedAt: string;
}) {
  if (status === "rejected") {
    return (
      <div
        style={{
          marginTop: 14,
          padding: "14px 16px",
          background: "rgba(106,106,114,0.08)",
          border: "1px solid rgba(106,106,114,0.2)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>✕</span>
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 13, fontWeight: 600, margin: 0 }}>
            Заявка отклонена
          </p>
          <p style={{ color: "#9a9aa4", fontSize: 12, margin: "2px 0 0" }}>
            Спасибо за участие — вы можете подать заявку на другую номинацию
          </p>
        </div>
      </div>
    );
  }

  if (status === "revision") {
    return (
      <div
        style={{
          marginTop: 14,
          padding: "14px 16px",
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.2)",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>⚠</span>
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 13, fontWeight: 600, margin: 0 }}>
            Требует доработки
          </p>
          <p style={{ color: "#9a9aa4", fontSize: 12, margin: "2px 0 0" }}>
            Ознакомьтесь с комментарием эксперта и внесите исправления
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = STAGES.findIndex((s) => s.key === status);

  return (
    <div style={{ marginTop: 16 }}>
      {/* Pipeline bar */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          position: "relative",
          padding: "0 4px",
        }}
      >
        {/* Background track */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            right: 20,
            height: 3,
            background: "var(--cab-border)",
            borderRadius: 2,
          }}
        />
        {/* Progress fill */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            width: currentIdx >= 0 ? `calc(${(currentIdx / (STAGES.length - 1)) * 100}% - 0px)` : "0%",
            height: 3,
            background: STATUS_COLORS[status] || "#0804ff",
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />

        {STAGES.map((stage, i) => {
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const color = STATUS_COLORS[status] || "#0804ff";

          return (
            <div
              key={stage.key}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Node */}
              <div
                style={{
                  width: isCurrent ? 28 : 20,
                  height: isCurrent ? 28 : 20,
                  borderRadius: "50%",
                  background: isDone ? color : "var(--cab-surface)",
                  border: `2.5px solid ${isDone ? color : "var(--cab-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isCurrent ? 13 : 10,
                  boxShadow: isCurrent ? `0 0 0 6px ${color}20, 0 0 20px ${color}30` : "none",
                  transition: "all 0.3s ease",
                }}
              >
                {isDone && (
                  <span style={{ filter: isCurrent ? "none" : "brightness(1.3)" }}>
                    {stage.icon}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  marginTop: 8,
                  fontSize: 10.5,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isDone ? "var(--cab-text2)" : "var(--cab-faint)",
                  textAlign: "center",
                  lineHeight: 1.3,
                  letterSpacing: "0.2px",
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </span>

              {/* Timestamp for current */}
              {isCurrent && (
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    color: color,
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 600,
                  }}
                >
                  текущий этап
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Meta info */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--cab-border-soft)",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--cab-faint)" }}>Отправлена:</span>
          <span style={{ fontSize: 11, color: "var(--cab-text2)", fontWeight: 600 }}>
            {new Date(createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--cab-faint)" }}>Обновлена:</span>
          <span style={{ fontSize: 11, color: "var(--cab-text2)", fontWeight: 600 }}>
            {new Date(updatedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--cab-faint)" }}>Статус:</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: STATUS_COLORS[status] || "#9a9aa4",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {STAGES.find((s) => s.key === status)?.label || status}
          </span>
        </div>
      </div>
    </div>
  );
}
