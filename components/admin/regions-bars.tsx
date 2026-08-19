"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const F = "var(--font-onest), sans-serif";

export type RegionCount = { region: string; count: number };

const REGION_COLORS = [
  "#0804ff", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
  "#84cc16", "#14b8a6", "#a855f7", "#3b82f6",
];

function RegionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: RegionCount }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#121216",
        border: "1px solid #2a2a32",
        borderRadius: 8,
        padding: "8px 14px",
        fontFamily: F,
        fontSize: 12,
      }}
    >
      <p style={{ color: "#f2f0ec", fontWeight: 600, margin: "0 0 2px" }}>{d.region}</p>
      <p style={{ color: "#0804ff", fontWeight: 700, margin: 0 }}>{d.count} заявок</p>
    </div>
  );
}

export function RegionsBars({ data }: { data: RegionCount[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count).slice(0, 12);
  const total = data.reduce((s, r) => s + r.count, 0);

  if (rows.length === 0) {
    return (
      <div style={{ width: "100%", maxWidth: 560, background: "#0e0e12", border: "1px solid #22222a", borderRadius: 14, padding: "18px 20px", fontFamily: F }}>
        <p style={{ color: "#6a6a72", fontSize: 13, margin: 0 }}>Заявок пока нет.</p>
      </div>
    );
  }

  const chartData = rows.map((r) => ({
    ...r,
    shortName: r.region.length > 20 ? r.region.slice(0, 18) + "…" : r.region,
  }));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 560,
        background: "#0e0e12",
        border: "1px solid #22222a",
        borderRadius: 14,
        padding: "18px 20px",
        fontFamily: F,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <p style={{ color: "#c8c8d0", fontSize: 13, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", margin: 0 }}>
          Заявки по регионам
        </p>
        <span style={{ color: "#6a6a72", fontSize: 12 }}>всего {total}</span>
      </div>

      <div style={{ width: "100%", height: 260, marginBottom: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: "#6a6a72", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="shortName"
              width={150}
              tick={{ fill: "#c8c8d0", fontSize: 11, fontFamily: F }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<RegionTooltip />} cursor={{ fill: "#0804ff08" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => {
          const max = Math.max(1, ...rows.map((x) => x.count));
          return (
            <div key={r.region} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#c8c8d0", fontSize: 11.5, width: 170, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.region}
              </span>
              <div style={{ flex: 1, height: 6, background: "#17171d", borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.round((r.count / max) * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #0804FF, #7b78ff)",
                    borderRadius: 999,
                  }}
                />
              </div>
              <span style={{ color: "#f2f0ec", fontSize: 11.5, fontWeight: 700, width: 24, textAlign: "right" }}>
                {r.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
