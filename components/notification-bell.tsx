"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const MONO = "'Onest', system-ui, sans-serif";
const F = "'Onest', system-ui, sans-serif";
const C = {
  bg: "#08080a",
  card: "#141416",
  card2: "#1a1a1e",
  border: "#2a2a2e",
  text: "#f2f0ec",
  dim: "#71717a",
  muted: "#a1a1aa",
  accent: "#0804ff",
  green: "#2fbf6b",
  red: "#ff3b30",
  orange: "#ff9500",
};

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Poll unread count every 30s
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const { getUnreadCount } = await import("@/lib/notifications/actions");
        const c = await getUnreadCount();
        if (alive) setCount(c);
      } catch { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items.length === 0) {
      setLoading(true);
      try {
        const { getMyNotifications } = await import("@/lib/notifications/actions");
        const notifs = await getMyNotifications(20);
        setItems(notifs.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
      } catch { /* ignore */ }
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      const { markAsRead } = await import("@/lib/notifications/actions");
      await markAsRead(id);
      setItems(items.map((n) => n.id === id ? { ...n, read: true } : n));
      setCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      const { markAllAsRead } = await import("@/lib/notifications/actions");
      await markAllAsRead();
      setItems(items.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch { /* ignore */ }
  };

  const typeColor = (t: string) =>
    t === "warning" ? C.orange : t === "success" ? C.green : t === "system" ? C.dim : C.accent;

  const typeIcon = (t: string) =>
    t === "warning" ? "⚠" : t === "success" ? "✓" : t === "system" ? "⚙" : "ℹ";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={toggle}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 6,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: C.red,
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          width: 360,
          maxHeight: 440,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontWeight: 700, fontFamily: F, fontSize: 14, color: C.text }}>
              Уведомления
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: C.accent,
                  fontSize: 12,
                  fontFamily: F,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Прочитать все
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflow: "auto" }}>
            {loading ? (
              <p style={{ color: C.dim, fontSize: 13, padding: 20, textAlign: "center", fontFamily: F }}>
                Загрузка...
              </p>
            ) : items.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 13, padding: 20, textAlign: "center", fontFamily: F, fontStyle: "italic" }}>
                Нет уведомлений
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) {
                      setOpen(false);
                      router.push(n.link);
                    }
                  }}
                  style={{
                    padding: "10px 16px",
                    borderBottom: `1px solid ${C.border}`,
                    cursor: n.link ? "pointer" : "default",
                    background: n.read ? "transparent" : `${C.accent}08`,
                    opacity: n.read ? 0.7 : 1,
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{
                      fontSize: 14,
                      color: typeColor(n.type),
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      {typeIcon(n.type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontFamily: F,
                        fontSize: 13,
                        color: C.text,
                        marginBottom: 2,
                      }}>
                        {n.title}
                        {!n.read && (
                          <span style={{
                            display: "inline-block",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: C.accent,
                            marginLeft: 6,
                            verticalAlign: "middle",
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: C.dim,
                        fontFamily: F,
                        lineHeight: 1.4,
                      }}>
                        {n.body}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: C.dim,
                        fontFamily: MONO,
                        marginTop: 4,
                      }}>
                        {new Date(n.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
