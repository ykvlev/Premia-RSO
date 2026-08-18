"use client";

import { useState } from "react";
import {
  createJury,
  setJuryNominations,
  setJuryPermissions,
  regenerateJuryPassword,
  deleteJury,
  type JuryPermissions,
} from "@/app/admin/jury-actions";

const F = "var(--font-onest), sans-serif";

type Nom = { id: string; title: string };

export type JuryRow = {
  id: string;
  fio: string;
  login: string;
  nominationIds: string[];
  permissions: JuryPermissions;
};

const PERMS: { key: keyof JuryPermissions; label: string }[] = [
  { key: "score", label: "Выставлять баллы" },
  { key: "comment", label: "Оставлять комментарии" },
  { key: "changeStatus", label: "Менять статус заявки" },
  { key: "viewContacts", label: "Видеть контакты заявителя" },
  { key: "blindScoring", label: "Слепая оценка (скрыть данные номинанта)" },
];

const cardStyle: React.CSSProperties = {
  background: "#121216",
  border: "1px solid #2a2a32",
  borderRadius: 14,
  padding: "18px 20px",
};

function Credentials({ login, password }: { login: string; password: string }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "12px 14px",
        background: "#0f1030",
        border: "1px solid #0804ff55",
        borderRadius: 10,
        fontFamily: F,
      }}
    >
      <p style={{ color: "#9a9aa4", fontSize: 12, margin: "0 0 8px" }}>
        Передайте эти данные жюри — пароль больше не покажется:
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 14, color: "#f2f0ec" }}>
        Логин: <b style={{ fontFamily: "monospace" }}>{login}</b>
      </p>
      <p style={{ margin: 0, fontSize: 14, color: "#f2f0ec" }}>
        Пароль: <b style={{ fontFamily: "monospace" }}>{password}</b>
      </p>
    </div>
  );
}

function Toggle({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: on ? "#0804ff18" : "transparent",
        border: `1px solid ${on ? "#0804ff" : "#2a2a32"}`,
        borderRadius: 8,
        color: on ? "#c8c8ff" : "#8a8a92",
        fontSize: 12.5,
        fontFamily: F,
        fontWeight: 600,
        padding: "7px 12px",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          border: `1px solid ${on ? "#0804ff" : "#3a3a44"}`,
          background: on ? "#0804ff" : "transparent",
          color: "#fff",
          fontSize: 10,
          lineHeight: "13px",
          textAlign: "center",
        }}
      >
        {on ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

function JuryCard({ row, nominations }: { row: JuryRow; nominations: Nom[] }) {
  const [noms, setNoms] = useState<string[]>(row.nominationIds);
  const [perms, setPerms] = useState<JuryPermissions>(row.permissions);
  const [creds, setCreds] = useState<{ login: string; password: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  const toggleNom = async (id: string) => {
    const next = noms.includes(id) ? noms.filter((n) => n !== id) : [...noms, id];
    setNoms(next);
    await setJuryNominations(row.id, next);
  };
  const togglePerm = async (key: keyof JuryPermissions) => {
    const next = { ...perms, [key]: !perms[key] };
    setPerms(next);
    await setJuryPermissions(row.id, next);
  };
  const regen = async () => {
    setBusy(true);
    const r = await regenerateJuryPassword(row.id);
    setBusy(false);
    if (r.ok) setCreds({ login: row.login, password: r.password });
  };
  const remove = async () => {
    if (!window.confirm(`Удалить жюри «${row.fio}» вместе с его оценками?`)) return;
    setBusy(true);
    const r = await deleteJury(row.id);
    if (r.ok) setDeleted(true);
    else setBusy(false);
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p style={{ color: "#f2f0ec", fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>
            {row.fio}
          </p>
          <p style={{ color: "#6a6a72", fontSize: 12.5, margin: 0, fontFamily: "monospace" }}>
            {row.login}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={regen}
            disabled={busy}
            style={{
              background: "transparent",
              border: "1px solid #2a2a32",
              borderRadius: 7,
              color: "#9a9aa4",
              fontSize: 12,
              fontFamily: F,
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Новый пароль
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            style={{
              background: "transparent",
              border: "1px solid #4a2a2e",
              borderRadius: 7,
              color: "#d98a8a",
              fontSize: 12,
              fontFamily: F,
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Удалить
          </button>
        </div>
      </div>

      {creds && <Credentials login={creds.login} password={creds.password} />}

      <div style={{ marginTop: 16 }}>
        <p style={{ color: "#9a9aa4", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
          Видимые номинации ({noms.length})
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {nominations.map((n) => (
            <Toggle
              key={n.id}
              on={noms.includes(n.id)}
              label={n.title}
              onClick={() => toggleNom(n.id)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <p style={{ color: "#9a9aa4", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
          Права на действия с заявками
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PERMS.map((p) => (
            <Toggle
              key={p.key}
              on={perms[p.key]}
              label={p.label}
              onClick={() => togglePerm(p.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function JuryManager({
  jury,
  nominations,
}: {
  jury: JuryRow[];
  nominations: Nom[];
}) {
  const [list, setList] = useState<JuryRow[]>(jury);
  const [fio, setFio] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCreds, setNewCreds] = useState<{ login: string; password: string } | null>(
    null,
  );
  const [error, setError] = useState("");

  const create = async () => {
    if (fio.trim().length < 2) {
      setError("Укажите ФИО");
      return;
    }
    setCreating(true);
    setError("");
    setNewCreds(null);
    const r = await createJury({ fio });
    setCreating(false);
    if (r.ok) {
      setList((l) => [
        {
          id: r.id,
          fio: fio.trim(),
          login: r.login,
          nominationIds: [],
          permissions: { score: true, comment: true, changeStatus: false, viewContacts: false, blindScoring: false },
        },
        ...l,
      ]);
      setNewCreds({ login: r.login, password: r.password });
      setFio("");
    } else {
      setError(r.error);
    }
  };

  return (
    <div>
      {/* Создание */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <p style={{ color: "#f2f0ec", fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
          Новый профиль жюри
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            placeholder="ФИО жюри (например, Иванов Иван Иванович)"
            style={{
              flex: 1,
              minWidth: 260,
              background: "#0d0d12",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: F,
              padding: "11px 13px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={create}
            disabled={creating}
            style={{
              background: creating ? "#1a1a22" : "#0804ff",
              color: creating ? "#6a6a72" : "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: F,
              border: "none",
              borderRadius: 8,
              padding: "11px 22px",
              cursor: creating ? "default" : "pointer",
            }}
          >
            {creating ? "Создаю…" : "Создать жюри"}
          </button>
        </div>
        {error && (
          <p style={{ color: "#e06a6a", fontSize: 13, margin: "10px 0 0" }}>{error}</p>
        )}
        {newCreds && <Credentials login={newCreds.login} password={newCreds.password} />}
      </div>

      {/* Список */}
      {list.length === 0 ? (
        <p style={{ color: "#6a6a72", fontSize: 14 }}>Профилей жюри пока нет.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map((row) => (
            <JuryCard key={row.id} row={row} nominations={nominations} />
          ))}
        </div>
      )}
    </div>
  );
}
