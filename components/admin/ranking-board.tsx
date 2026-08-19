"use client";

import { useState } from "react";
import { updateApplicationStatus } from "@/app/admin/actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  Treemap,
} from "recharts";

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

const COLORS = [
  "#0804ff", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
];

function NominationChart({ apps }: { apps: RankApp[] }) {
  const data = apps
    .filter((a) => a.avg !== null)
    .slice(0, 8)
    .map((a) => ({
      name: a.nominee.length > 18 ? a.nominee.slice(0, 16) + "…" : a.nominee,
      avg: a.avg,
      status: a.status,
    }));

  if (data.length === 0) return null;

  return (
    <div style={{ width: "100%", height: 220, marginBottom: 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#6a6a72", fontSize: 10, fontFamily: F }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: "#6a6a72", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: "#121216",
              border: "1px solid #2a2a32",
              borderRadius: 8,
              fontFamily: F,
              fontSize: 12,
              color: "#f2f0ec",
            }}
            formatter={(value) => [Number(value ?? 0), "Ср. балл"]}
            labelStyle={{ color: "#9a9aa4", fontSize: 11 }}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.status === "winner"
                    ? "#0804ff"
                    : entry.status === "approved" || entry.status === "finalist"
                      ? "#22c55e"
                      : COLORS[i % COLORS.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
          <NominationChart apps={n.apps} />
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
