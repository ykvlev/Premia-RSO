"use client";

import { useState } from "react";
import { checkApplicationStatus } from "@/app/status/actions";

const F = "var(--font-onest), sans-serif";

const input: React.CSSProperties = {
  width: "100%",
  background: "#0d0d12",
  border: "1px solid #2a2a32",
  borderRadius: 10,
  color: "#f2f0ec",
  fontSize: 15,
  fontFamily: F,
  padding: "13px 15px",
  outline: "none",
  boxSizing: "border-box",
};

type Result = Awaited<ReturnType<typeof checkApplicationStatus>>;

export function StatusCheck() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setRes(null);
    try {
      setRes(await checkApplicationStatus({ number, email }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", color: "#9a9aa4", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: F }}>
            Номер заявки
          </label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="например, a1b2c3"
            style={input}
          />
        </div>
        <div>
          <label style={{ display: "block", color: "#9a9aa4", fontSize: 12, fontWeight: 600, marginBottom: 6, fontFamily: F }}>
            Email, указанный в заявке
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.ru"
            style={input}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: pending ? "#1a1a22" : "#0804ff",
            color: pending ? "#6a6a72" : "#fff",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: F,
            border: "none",
            borderRadius: 10,
            padding: "13px",
            cursor: pending ? "default" : "pointer",
            marginTop: 4,
          }}
        >
          {pending ? "Проверяем…" : "Проверить статус"}
        </button>
      </form>

      {res && (
        <div style={{ marginTop: 20 }}>
          {res.ok ? (
            <div
              style={{
                background: "#0f1030",
                border: "1px solid #0804ff44",
                borderRadius: 12,
                padding: "18px 20px",
                fontFamily: F,
              }}
            >
              <p style={{ color: "#9a9aa4", fontSize: 13, margin: "0 0 4px" }}>
                {res.nomination} · подана {res.submitted}
              </p>
              <p style={{ color: "#f2f0ec", fontSize: 22, fontWeight: 800, margin: 0 }}>
                {res.status}
              </p>
              {res.comment && (
                <p style={{ color: "#c8c8d0", fontSize: 13, margin: "12px 0 0", lineHeight: 1.5 }}>
                  Комментарий эксперта: {res.comment}
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: "#e06a6a", fontSize: 14, fontFamily: F }}>{res.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
