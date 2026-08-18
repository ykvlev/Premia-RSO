"use client";

import { useState } from "react";
import { changePassword } from "@/app/account/actions";

const F = "var(--font-onest), sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--cab-inset)",
  border: "1px solid var(--cab-border)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  fontFamily: F,
  color: "var(--cab-text)",
  outline: "none",
};

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ ok: false, text: "Новый пароль — минимум 8 символов" });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: "Пароли не совпадают" });
      return;
    }
    setPending(true);
    const res = await changePassword(current, next);
    setPending(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Пароль изменён" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "transparent",
          border: "1px solid var(--cab-border)",
          color: "var(--cab-muted)",
          fontFamily: F,
          fontSize: 13,
          borderRadius: 999,
          padding: "9px 18px",
          cursor: "pointer",
        }}
      >
        Сменить пароль
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: "var(--cab-surface)",
        border: "1px solid var(--cab-border)",
        borderRadius: 16,
        padding: "22px 22px",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p style={{ color: "var(--cab-text)", fontSize: 16, fontFamily: F, fontWeight: 700, margin: 0 }}>
        Смена пароля
      </p>
      <input
        type="password"
        placeholder="Текущий пароль"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        required
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Новый пароль (минимум 8 символов)"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        required
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Повторите новый пароль"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
        style={inputStyle}
      />
      {msg && (
        <p
          style={{
            color: msg.ok ? "#7bd88f" : "#ff6b6b",
            fontSize: 13,
            fontFamily: F,
            margin: 0,
          }}
        >
          {msg.text}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#0804ff",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "11px 22px",
            fontSize: 14,
            fontFamily: F,
            fontWeight: 600,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMsg(null);
          }}
          style={{
            background: "transparent",
            border: "1px solid var(--cab-border)",
            color: "var(--cab-muted)",
            borderRadius: 999,
            padding: "11px 20px",
            fontSize: 14,
            fontFamily: F,
            cursor: "pointer",
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
