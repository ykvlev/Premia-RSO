"use client";

import { useState, useRef, useEffect } from "react";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Comment = {
  id: string;
  author: string;
  authorName: string;
  authorRole: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  participant: { label: "Участник", color: "#2fbf6b", bg: "rgba(47,191,107,0.1)" },
  admin: { label: "Оргкомитет", color: "#0804ff", bg: "rgba(8,4,255,0.1)" },
  jury: { label: "Жюри", color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
  system: { label: "Система", color: "#9a9aa4", bg: "rgba(154,154,164,0.08)" },
};

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
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ApplicationComments({
  comments,
  applicationId,
  userRole,
  userName,
}: {
  comments: Comment[];
  applicationId: string;
  userRole: string;
  userName: string;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [localComments, setLocalComments] = useState(comments);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localComments.length]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, body: text.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.comment) {
        setLocalComments((prev) => [...prev, data.comment]);
        setText("");
      }
    } catch {}
    setSending(false);
  }

  const visibleComments = localComments.filter((c) => !c.isInternal || userRole === "admin");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Comments list */}
      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
          padding: "4px 0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {visibleComments.length === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              textAlign: "center",
              color: "var(--cab-faint)",
              fontSize: 13,
              fontFamily: F,
            }}
          >
            <span style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.4 }}>💬</span>
            Нет комментариев — начните обсуждение
          </div>
        ) : (
          visibleComments.map((c) => {
            const role = ROLE_LABELS[c.authorRole] || ROLE_LABELS.participant;
            return (
              <div key={c.id} style={{ display: "flex", gap: 10 }}>
                {/* Avatar */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: role.bg,
                    border: `1.5px solid ${role.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: role.color,
                    flexShrink: 0,
                    fontFamily: F,
                  }}
                >
                  {c.authorName?.[0]?.toUpperCase() || "?"}
                </div>

                {/* Bubble */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cab-text2)", fontFamily: F }}>
                      {c.authorName || c.author.split("@")[0]}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: role.color,
                        background: role.bg,
                        borderRadius: 4,
                        padding: "1px 6px",
                        fontFamily: F,
                      }}
                    >
                      {role.label}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--cab-faint)", fontFamily: MONO }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div
                    style={{
                      background: "var(--cab-surface2)",
                      border: "1px solid var(--cab-border)",
                      borderRadius: "4px 12px 12px 12px",
                      padding: "8px 12px",
                      color: "var(--cab-text2)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      fontFamily: F,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {c.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--cab-border)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Напишите комментарий..."
          style={{
            flex: 1,
            background: "var(--cab-surface2)",
            border: "1px solid var(--cab-border)",
            borderRadius: 8,
            padding: "10px 12px",
            color: "var(--cab-text)",
            fontSize: 13,
            fontFamily: F,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            background: text.trim() ? "#0804ff" : "var(--cab-surface2)",
            color: text.trim() ? "#fff" : "var(--cab-faint)",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: text.trim() ? "pointer" : "not-allowed",
            fontFamily: F,
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          {sending ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}
