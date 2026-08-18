"use client";

import { useState } from "react";
import { updateApplicationStatus } from "@/app/admin/actions";

const F = "var(--font-onest), sans-serif";

export type RankApp = {
  id: string;
  nominee: string;
  region: string;
  avg: number | null;
  count: number;
  status: string;
};

export type RankNomination = {
  id: string;
  title: string;
  apps: RankApp[];
};

const STATUS_LABEL: Record<string, string> = {
  new: "Отправлена",
  queued: "Ожидает",
  review: "На рассмотрении",
  revision: "Доработка",
  scoring: "На оценке",
  finalist: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};
const STATUS_COLOR: Record<string, string> = {
  winner: "#0804ff",
  finalist: "#22c55e",
  rejected: "#ef4444",
};

function medal(place: number): string {
  return place === 0 ? "🥇" : place === 1 ? "🥈" : place === 2 ? "🥉" : `${place + 1}`;
}

function Row({ app, place }: { app: RankApp; place: number }) {
  const [status, setStatus] = useState(app.status);
  const [busy, setBusy] = useState(false);

  async function set(mock: string) {
    setBusy(true);
    const prev = status;
    // локальная метка (mock → db-подобная) для мгновенного отклика
    const optimistic =
      mock === "approved" ? "finalist" : mock === "winner" ? "winner" : "rejected";
    setStatus(optimistic);
    const r = await updateApplicationStatus(app.id, mock);
    setBusy(false);
    if (!r.ok) setStatus(prev);
  }

  const btn = (label: string, mock: string, color: string) => (
    <button
      onClick={() => set(mock)}
      disabled={busy}
      style={{
        background: "transparent",
        border: `1px solid ${color}55`,
        borderRadius: 7,
        color,
        fontSize: 12,
        fontFamily: F,
        fontWeight: 600,
        padding: "5px 10px",
        cursor: busy ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 14px",
        borderRadius: 10,
        background: place === 0 ? "#0f1030" : "#0e0e12",
        border: `1px solid ${place === 0 ? "#0804ff44" : "#1e1e24"}`,
      }}
    >
      <div style={{ width: 30, textAlign: "center", fontSize: 18, flexShrink: 0 }}>
        {medal(place)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#f2f0ec", fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
          {app.nominee}
        </p>
        <p style={{ color: "#6a6a72", fontSize: 12, margin: 0 }}>
          {app.region} · оценок: {app.count}
          {STATUS_COLOR[status] && (
            <>
              {" · "}
              <span style={{ color: STATUS_COLOR[status], fontWeight: 700 }}>
                {STATUS_LABEL[status] ?? status}
              </span>
            </>
          )}
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 56 }}>
        <p style={{ color: "#0804ff", fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1 }}>
          {app.avg ?? "—"}
        </p>
        <p style={{ color: "#6a6a72", fontSize: 10, margin: "2px 0 0" }}>ср. балл</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {btn("Победитель", "winner", "#0804ff")}
        {btn("Финалист", "approved", "#22c55e")}
      </div>
    </div>
  );
}

export function RankingBoard({ nominations }: { nominations: RankNomination[] }) {
  if (nominations.length === 0) {
    return <p style={{ color: "#6a6a72", fontSize: 14 }}>Заявок для рейтинга пока нет.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {nominations.map((n) => (
        <div key={n.id}>
          <p
            style={{
              color: "#c8c8d0",
              fontSize: 15,
              fontWeight: 700,
              margin: "0 0 12px",
              paddingBottom: 8,
              borderBottom: "1px solid #1e1e24",
            }}
          >
            {n.title}{" "}
            <span style={{ color: "#6a6a72", fontWeight: 500 }}>· {n.apps.length}</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {n.apps.map((a, i) => (
              <Row key={a.id} app={a} place={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
