"use client";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Event = {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
};

const ACTION_ICONS: Record<string, string> = {
  создана: "📨",
  отправлена: "📨",
  статус: "🔄",
  оценка: "⭐",
  комментарий: "💬",
  комментарий_эксперта: "💬",
  доработка: "⚠️",
  отклонена: "✕",
  победитель: "🏆",
  финалист: "⭐",
};

function getActionIcon(action: string): string {
  const lower = action.toLowerCase();
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  if (lower.includes("отправ")) return "📨";
  if (lower.includes("рассмотр")) return "🔍";
  return "📋";
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function ActivityTimeline({ events }: { events: Event[] }) {
  if (!events || events.length === 0) {
    return (
      <div
        style={{
          padding: "24px 16px",
          textAlign: "center",
          color: "var(--cab-faint)",
          fontSize: 13,
          fontFamily: F,
        }}
      >
        <span style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.4 }}>📋</span>
        Пока нет действий по заявке
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {events.map((ev, i) => {
        const icon = getActionIcon(ev.action);
        const isLast = i === events.length - 1;

        return (
          <div
            key={ev.id}
            style={{
              display: "flex",
              gap: 12,
              position: "relative",
              paddingBottom: isLast ? 0 : 16,
            }}
          >
            {/* Timeline line */}
            {!isLast && (
              <div
                style={{
                  position: "absolute",
                  left: 13,
                  top: 28,
                  bottom: 0,
                  width: 1.5,
                  background: "var(--cab-border)",
                }}
              />
            )}

            {/* Icon node */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--cab-surface2)",
                border: "1.5px solid var(--cab-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
                zIndex: 1,
              }}
            >
              {icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "var(--cab-text2)",
                  fontSize: 13,
                  fontWeight: 500,
                  margin: 0,
                  lineHeight: 1.4,
                  fontFamily: F,
                }}
              >
                {ev.action}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span
                  style={{
                    color: "var(--cab-faint)",
                    fontSize: 11,
                    fontFamily: MONO,
                  }}
                >
                  {timeAgo(ev.createdAt)}
                </span>
                <span
                  style={{
                    color: "var(--cab-faint)",
                    fontSize: 11,
                    opacity: 0.6,
                  }}
                >
                  · {ev.actor.split("@")[0]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
