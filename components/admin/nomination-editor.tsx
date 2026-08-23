"use client";

import { useState } from "react";
import { updateNomination } from "@/app/admin/super/actions";

type Field = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
};
type Criterion = {
  key: string;
  label: string;
  maxScore: number;
  weight: number;
  step: number;
};
export type NomData = {
  id: string;
  title: string;
  participantType: string;
  description: string;
  formSchema: Field[];
  criteria: Criterion[];
};

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const TYPES: { v: string; l: string }[] = [
  { v: "text", l: "Строка" },
  { v: "textarea", l: "Текст (многострочно)" },
  { v: "number", l: "Число" },
  { v: "select", l: "Выбор из списка" },
  { v: "url", l: "Ссылка" },
  { v: "file", l: "Файл" },
];

const input: React.CSSProperties = {
  background: "#0a0a0d",
  border: "1px solid #26262e",
  borderRadius: 8,
  color: "#f2f0ec",
  fontSize: 13,
  fontFamily: F,
  padding: "8px 11px",
  width: "100%",
  boxSizing: "border-box",
};

function translit(s: string): string {
  const M: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya",
  };
  const words = s.toLowerCase().trim().split(/\s+/).slice(0, 4);
  const t = words
    .map((w) => [...w].map((c) => (c in M ? M[c] : /[a-z0-9]/.test(c) ? c : "")).join(""))
    .filter(Boolean);
  if (t.length === 0) return "field";
  return t[0] + t.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function NominationRow({ nom }: { nom: NomData }) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(nom.description);
  const [fields, setFields] = useState<Field[]>(nom.formSchema.map((f) => ({ ...f })));
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    nom.criteria.length > 0 ? nom.criteria.map((c) => ({ ...c, step: 1 })) : [{ key: "c1", label: "", maxScore: 10, weight: 1, step: 1 }],
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (i: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => setFields((fs) => fs.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) =>
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const c = [...fs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const add = () =>
    setFields((fs) => [...fs, { name: `field${fs.length + 1}`, label: "", type: "text" }]);

  const setCrit = (i: number, patch: Partial<Criterion>) =>
    setCriteria((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const removeCrit = (i: number) => setCriteria((cs) => cs.filter((_, j) => j !== i));
  const moveCrit = (i: number, dir: -1 | 1) =>
    setCriteria((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const c = [...cs];
      [c[i], c[j]] = [c[j], c[i]];
      return c.map((x, idx) => ({ ...x, key: `c${idx + 1}` }));
    });
  const addCrit = () =>
    setCriteria((cs) => [...cs, { key: `c${cs.length + 1}`, label: "", maxScore: 10, weight: 1, step: 1 }]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await updateNomination(nom.id, { description: desc, formSchema: fields, criteria });
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: "Сохранено" } : { ok: false, text: res.error ?? "Ошибка" });
    if (res.ok) setTimeout(() => setMsg(null), 3000);
  };

  return (
    <section
      style={{
        background: "#0e0e12",
        border: "1px solid #22222a",
        borderRadius: 14,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: "#f2f0ec", fontSize: 14.5, fontFamily: F, fontWeight: 700, margin: 0 }}>
            {nom.title}
          </p>
          <p style={{ color: "#6a6a72", fontSize: 12, fontFamily: F, margin: "3px 0 0" }}>
            {nom.participantType} · {criteria.length} критериев · {fields.length} полей
          </p>
        </div>
        <span style={{ color: "#6a6a72", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1a1a20" }}>
          <label style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F, fontWeight: 600, display: "block", margin: "16px 0 6px" }}>
            Описание номинации
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
          />

          <p style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", margin: "20px 0 10px" }}>
            Критерии оценки жюри ({criteria.length}) — 1–10 баллов, вес
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {criteria.map((c, i) => (
              <div
                key={i}
                style={{ background: "#0a0a0d", border: "1px solid #1e1e26", borderRadius: 10, padding: 10, display: "flex", gap: 8, alignItems: "center" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <button onClick={() => moveCrit(i, -1)} title="Выше" style={arrow}>↑</button>
                  <button onClick={() => moveCrit(i, 1)} title="Ниже" style={arrow}>↓</button>
                </div>
                <input
                  value={c.label}
                  onChange={(e) => setCrit(i, { label: e.target.value })}
                  placeholder={`Критерий ${i + 1}`}
                  style={{ ...input, flex: 1 }}
                />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <label style={{ color: "#6a6a72", fontSize: 11, fontFamily: F }}>Макс</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={c.maxScore}
                    onChange={(e) => setCrit(i, { maxScore: Number(e.target.value) || 0 })}
                    style={{ ...input, width: 64, fontFamily: MONO, fontSize: 12, padding: "6px 8px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <label style={{ color: "#6a6a72", fontSize: 11, fontFamily: F }}>Вес</label>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={c.weight}
                    onChange={(e) => setCrit(i, { weight: Number(e.target.value) || 1 })}
                    style={{ ...input, width: 58, fontFamily: MONO, fontSize: 12, padding: "6px 8px" }}
                  />
                </div>
                <span style={{ color: "#4a4a52", fontSize: 11, fontFamily: F, whiteSpace: "nowrap" }} title="баллы 1–10">1–10</span>
                <button onClick={() => removeCrit(i)} title="Удалить критерий" style={{ ...arrow, color: "#ff6b6b", borderColor: "#ff6b6b44" }}>✕</button>
              </div>
            ))}
          </div>
          <button
            onClick={addCrit}
            style={{
              background: "transparent",
              border: "1px dashed #2b4cff66",
              color: "#93a4ff",
              borderRadius: 9,
              padding: "7px 14px",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              marginBottom: 16,
            }}
          >
            + Добавить критерий
          </button>

          <p style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", margin: "20px 0 10px" }}>
            Официальные поля заявки ({fields.length})
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fields.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "#0a0a0d",
                  border: "1px solid #1e1e26",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
                    <button onClick={() => move(i, -1)} title="Выше" style={arrow}>↑</button>
                    <button onClick={() => move(i, 1)} title="Ниже" style={arrow}>↓</button>
                  </div>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                    <input
                      value={f.label}
                      onChange={(e) =>
                        set(i, {
                          label: e.target.value,
                          name: translit(e.target.value) || f.name,
                        })
                      }
                      placeholder="Подпись поля (как видит участник)"
                      style={input}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <select value={f.type} onChange={(e) => set(i, { type: e.target.value })} style={{ ...input, flex: 1 }}>
                        {TYPES.map((t) => (
                          <option key={t.v} value={t.v} style={{ background: "#121216" }}>
                            {t.l}
                          </option>
                        ))}
                      </select>
                      <span style={{ alignSelf: "center", color: "#4a4a52", fontSize: 11, fontFamily: MONO, whiteSpace: "nowrap" }} title="служебное имя — генерируется автоматически">
                        {f.name || translit(f.label) || "—"}
                      </span>
                    </div>
                    {f.type === "select" && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <input
                          value={(f.options ?? []).join(", ")}
                          onChange={(e) => set(i, { options: e.target.value.split(",").map((o) => o.trim()) })}
                          placeholder="Варианты через запятую: Да, Нет"
                          style={input}
                        />
                      </div>
                    )}
                    <label
                      style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#9a9aa4",
                        fontSize: 13,
                        fontFamily: F,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => set(i, { required: e.target.checked })}
                      />
                      Обязательное поле
                    </label>
                  </div>
                  <button onClick={() => remove(i)} title="Удалить поле" style={{ ...arrow, color: "#ff6b6b", borderColor: "#ff6b6b44" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={add}
            style={{
              marginTop: 10,
              background: "transparent",
              border: "1px dashed #2b4cff66",
              color: "#93a4ff",
              borderRadius: 9,
              padding: "9px 14px",
              fontSize: 13,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            + Добавить поле
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: "#2b4cff",
                border: "none",
                color: "#fff",
                borderRadius: 9,
                padding: "10px 20px",
                fontSize: 13.5,
                fontFamily: F,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "Сохраняю…" : "Сохранить номинацию"}
            </button>
            {msg && (
              <span style={{ color: msg.ok ? "#2fbf6b" : "#ff6b6b", fontSize: 13, fontFamily: F, fontWeight: 600 }}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

const arrow: React.CSSProperties = {
  width: 26,
  height: 22,
  background: "#111117",
  border: "1px solid #26262e",
  borderRadius: 6,
  color: "#9a9aa4",
  fontSize: 11,
  cursor: "pointer",
  flexShrink: 0,
  lineHeight: 1,
};

export function NominationEditor({ nominations }: { nominations: NomData[] }) {
  return (
    <div>
      {nominations.map((n) => (
        <NominationRow key={n.id} nom={n} />
      ))}
    </div>
  );
}
