"use client";

import { useState } from "react";
import { broadcastMail, previewBroadcastEmail } from "@/app/admin/actions";

const F = "var(--font-onest), sans-serif";

type Nom = { id: string; title: string };

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: "all", label: "Все заявители" },
  { value: "new", label: "Только новые" },
  { value: "review", label: "На рассмотрении" },
  { value: "approved", label: "Одобренные (финалисты)" },
  { value: "winner", label: "Победители" },
  { value: "rejected", label: "Отклонённые" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0d0d12",
  border: "1px solid #2a2a32",
  borderRadius: 8,
  color: "#f2f0ec",
  fontSize: 14,
  fontFamily: F,
  padding: "11px 13px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#9a9aa4",
  fontSize: 12,
  fontWeight: 600,
  fontFamily: F,
  marginBottom: 7,
};

export function MailingForm({ nominations }: { nominations: Nom[] }) {
  const [status, setStatus] = useState("all");
  const [nominationId, setNominationId] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; total: number; sent: number; failed: number }
    | { ok: false; error: string }
    | null
  >(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function onPreview() {
    if (!body.trim()) {
      setResult({ ok: false, error: "Введите текст письма для предпросмотра" });
      return;
    }
    setPreviewing(true);
    try {
      const r = await previewBroadcastEmail(body);
      if (r.ok) setPreviewHtml(r.html);
      else setResult({ ok: false, error: r.error });
    } catch {
      setResult({ ok: false, error: "Не удалось построить предпросмотр" });
    } finally {
      setPreviewing(false);
    }
  }

  async function onSend() {
    if (!subject.trim() || !body.trim()) {
      setResult({ ok: false, error: "Заполните тему и текст письма" });
      return;
    }
    const recipientsLabel =
      STATUS_OPTS.find((s) => s.value === status)?.label ?? "выбранной группе";
    if (
      !window.confirm(
        `Отправить письмо «${subject.trim()}» получателям: ${recipientsLabel}?`,
      )
    ) {
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const r = await broadcastMail({ subject, body, status, nominationId });
      setResult(r);
      if (r.ok) {
        setSubject("");
        setBody("");
      }
    } catch {
      setResult({ ok: false, error: "Ошибка отправки. Попробуйте ещё раз." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Кому</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Номинация</label>
          <select
            value={nominationId}
            onChange={(e) => setNominationId(e.target.value)}
            style={inputStyle}
          >
            <option value="all">Все номинации</option>
            {nominations.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Тема письма</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Например: Приглашение на церемонию награждения"
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Текст письма</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          placeholder="Текст обращения к заявителям…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
        />
        <p style={{ color: "#6a6a72", fontSize: 12, fontFamily: F, marginTop: 8 }}>
          Каждому получателю добавится приветствие по имени и подпись оргкомитета.
          Одному адресу — одно письмо, даже если заявок несколько.
        </p>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          onClick={onSend}
          disabled={sending}
          style={{
            background: sending ? "#1a1a22" : "#0804ff",
            color: sending ? "#6a6a72" : "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: F,
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            cursor: sending ? "default" : "pointer",
          }}
        >
          {sending ? "Отправка…" : "Отправить рассылку"}
        </button>

        <button
          onClick={onPreview}
          disabled={previewing}
          style={{
            background: "transparent",
            color: "#c8c8d0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: F,
            border: "1px solid #2a2a32",
            borderRadius: 8,
            padding: "12px 20px",
            cursor: previewing ? "default" : "pointer",
          }}
        >
          {previewing ? "Готовлю…" : "Предпросмотр"}
        </button>

        {result && (
          <span
            style={{
              fontSize: 13,
              fontFamily: F,
              fontWeight: 600,
              color: result.ok ? "#2fbf6b" : "#e06a6a",
            }}
          >
            {result.ok
              ? `Отправлено ${result.sent} из ${result.total}` +
                (result.failed ? ` · ошибок: ${result.failed}` : "")
              : result.error}
          </span>
        )}
      </div>

      {previewHtml && (
        <div
          onClick={() => setPreviewHtml(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflow: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 680,
              background: "#0e0e12",
              border: "1px solid #2a2a32",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid #1e1e24",
              }}
            >
              <span style={{ color: "#f2f0ec", fontSize: 14, fontWeight: 700, fontFamily: F }}>
                Предпросмотр письма
              </span>
              <button
                onClick={() => setPreviewHtml(null)}
                aria-label="Закрыть"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9a9aa4",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <iframe
              title="Предпросмотр письма"
              srcDoc={previewHtml}
              style={{
                width: "100%",
                height: "72vh",
                border: "none",
                background: "#060608",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
