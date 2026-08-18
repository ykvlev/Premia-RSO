"use client";

import { useState } from "react";
import { submitEvaluation, juryUpdateStatus, toggleRecusal } from "@/app/jury/actions";

const F = "var(--font-onest), sans-serif";

export type Criterion = { key: string; label: string; max: number };

export type JuryPerms = {
  score: boolean;
  comment: boolean;
  changeStatus: boolean;
  viewContacts: boolean;
  blindScoring: boolean;
};

export type JuryItem = {
  id: string;
  nominationTitle: string;
  nominee: string;
  region: string;
  submitted: string;
  status: string;
  criteria: Criterion[];
  myScores: Record<string, number>;
  myComment: string;
  email?: string;
  phone?: string;
  recused: boolean;
};

const STATUS: { key: string; label: string }[] = [
  { key: "new", label: "Отправлена" },
  { key: "queued", label: "Ожидает рассмотрения" },
  { key: "review", label: "На рассмотрении" },
  { key: "revision", label: "Требует доработки" },
  { key: "scoring", label: "На оценке жюри" },
  { key: "finalist", label: "Финалист" },
  { key: "winner", label: "Победитель" },
  { key: "rejected", label: "Отклонена" },
];
const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS.map((s) => [s.key, s.label]),
);

function JuryCard({ item, perms }: { item: JuryItem; perms: JuryPerms }) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of item.criteria) init[c.key] = item.myScores[c.key] ?? 0;
    return init;
  });
  const [comment, setComment] = useState(item.myComment);
  const [status, setStatus] = useState(item.status);
  const [saving, setSaving] = useState(false);
  const [recused, setRecused] = useState(item.recused);
  const [saved, setSaved] = useState(
    Object.keys(item.myScores).length > 0 || item.myComment.length > 0,
  );

  const canEvaluate = perms.score || perms.comment;

  async function onToggleRecusal() {
    if (
      !recused &&
      !window.confirm(
        "Взять самоотвод по этой заявке (конфликт интересов)? Ваша оценка будет снята.",
      )
    ) {
      return;
    }
    const r = await toggleRecusal(item.id);
    if (r.ok) {
      setRecused(r.recused);
      if (r.recused) setSaved(false);
    }
  }
  const total = item.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0);
  const maxTotal = item.criteria.reduce((s, c) => s + c.max, 0);

  function setScore(key: string, value: number, max: number) {
    const v = Math.max(0, Math.min(max, Math.round(value)));
    setScores((p) => ({ ...p, [key]: v }));
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    try {
      const r = await submitEvaluation({ applicationId: item.id, scores, comment });
      if (r.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function onStatus(next: string) {
    const prev = status;
    setStatus(next);
    const r = await juryUpdateStatus(item.id, next);
    if (!r.ok) setStatus(prev);
  }

  return (
    <div
      style={{
        background: "#121216",
        border: "1px solid #2a2a32",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ color: "#f2f0ec", fontSize: 17, fontWeight: 700, margin: "0 0 5px" }}>
            {item.nominee}
          </p>
          <p style={{ color: "#9a9aa4", fontSize: 13, margin: "0 0 2px" }}>
            {item.nominationTitle}
          </p>
          <p style={{ color: "#6a6a72", fontSize: 12, margin: 0 }}>
            {item.region ? `${item.region} · ` : ""}подана {item.submitted} · № {item.id.slice(-6)}
          </p>
          {perms.viewContacts && (item.email || item.phone) && (
            <p style={{ color: "#8a8a92", fontSize: 12.5, margin: "8px 0 0" }}>
              {item.email && <>✉ {item.email}</>}
              {item.email && item.phone && "  ·  "}
              {item.phone && <>☎ {item.phone}</>}
            </p>
          )}
        </div>
        {perms.score && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ color: "#0804ff", fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1 }}>
              {total}
            </p>
            <p style={{ color: "#6a6a72", fontSize: 11, margin: "3px 0 0" }}>из {maxTotal}</p>
          </div>
        )}
      </div>

      {recused ? (
        <div
          style={{
            marginTop: 4,
            padding: "12px 14px",
            background: "#15151a",
            border: "1px solid #2a2a32",
            borderRadius: 10,
          }}
        >
          <p style={{ color: "#c8c8d0", fontSize: 13, margin: "0 0 10px", lineHeight: 1.5 }}>
            Вы взяли самоотвод по этой заявке (конфликт интересов) — она исключена из
            вашей оценки.
          </p>
          <button
            onClick={onToggleRecusal}
            style={{
              background: "transparent",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              color: "#9a9aa4",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              padding: "7px 14px",
              cursor: "pointer",
            }}
          >
            Отменить самоотвод
          </button>
        </div>
      ) : (
        <>

      {/* Смена статуса */}
      {perms.changeStatus && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", color: "#9a9aa4", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Статус заявки
          </label>
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value)}
            style={{
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              padding: "9px 12px",
              outline: "none",
            }}
          >
            {STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Баллы */}
      {perms.score && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {item.criteria.map((c) => (
            <div key={c.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color: "#c8c8d0", fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                <span style={{ color: "#9a9aa4", fontSize: 13, fontWeight: 700 }}>
                  {scores[c.key] ?? 0} <span style={{ color: "#4a4a52", fontWeight: 500 }}>/ {c.max}</span>
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={c.max}
                step={1}
                value={scores[c.key] ?? 0}
                onChange={(e) => setScore(c.key, Number(e.target.value), c.max)}
                style={{ width: "100%", accentColor: "#0804ff", cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Комментарий */}
      {perms.comment ? (
        <div style={{ marginTop: perms.score ? 16 : 0 }}>
          <label style={{ display: "block", color: "#9a9aa4", fontSize: 12, fontWeight: 600, marginBottom: 7 }}>
            Комментарий (виден только оргкомитету)
          </label>
          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setSaved(false);
            }}
            rows={3}
            placeholder="Обоснование оценки…"
            style={{
              width: "100%",
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              padding: "10px 12px",
              outline: "none",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </div>
      ) : (
        item.myComment && (
          <p style={{ color: "#c8c8d0", fontSize: 13, margin: "12px 0 0", padding: "10px 12px", background: "#0f0f14", borderRadius: 6, lineHeight: 1.5 }}>
            Комментарий: {item.myComment}
          </p>
        )
      )}

      {canEvaluate && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              background: saving ? "#1a1a22" : "#0804ff",
              color: saving ? "#6a6a72" : "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: F,
              border: "none",
              borderRadius: 8,
              padding: "10px 22px",
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Сохранение…" : saved ? "Обновить оценку" : "Сохранить оценку"}
          </button>
          {saved && !saving && (
            <span style={{ color: "#2fbf6b", fontSize: 13, fontWeight: 600 }}>Оценка сохранена</span>
          )}
        </div>
      )}

      {!perms.score && !perms.changeStatus && (
        <p style={{ color: "#6a6a72", fontSize: 12.5, margin: "12px 0 0" }}>
          Текущий статус: {STATUS_LABEL[item.status] ?? item.status}
        </p>
      )}

      <button
        onClick={onToggleRecusal}
        style={{
          marginTop: 14,
          background: "transparent",
          border: "none",
          color: "#6a6a72",
          fontSize: 12,
          fontFamily: F,
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        Взять самоотвод (конфликт интересов)
      </button>
        </>
      )}
    </div>
  );
}

export function JuryBoard({ items, perms }: { items: JuryItem[]; perms: JuryPerms }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((it) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      it.nominee.toLowerCase().includes(q) ||
      it.nominationTitle.toLowerCase().includes(q) ||
      it.region.toLowerCase().includes(q)
    );
  });

  if (items.length === 0) {
    return (
      <div
        style={{
          border: "1px solid #2a2a32",
          borderRadius: 16,
          padding: "40px 24px",
          textAlign: "center",
          background: "#121216",
          color: "#9a9aa4",
          fontSize: 15,
          fontFamily: F,
        }}
      >
        Пока нет заявок для оценки по закреплённым за вами номинациям.
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по номинанту, номинации, региону…"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0d0d12",
          border: "1px solid #2a2a32",
          borderRadius: 8,
          color: "#f2f0ec",
          fontSize: 14,
          fontFamily: F,
          padding: "10px 13px",
          outline: "none",
          marginBottom: 20,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((it) => (
          <JuryCard key={it.id} item={it} perms={perms} />
        ))}
      </div>
    </div>
  );
}
