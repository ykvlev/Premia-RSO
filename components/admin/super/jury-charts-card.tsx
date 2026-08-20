"use client";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = { bg: "#08080a", card: "#0e0e12", card2: "#121216", border: "#22222a", text: "#f2f0ec", muted: "#9a9aa4", dim: "#6a6a72", accent: "#0804ff", green: "#2fbf6b", red: "#ff6b6b", amber: "#f5a623", purple: "#8a5cf6" };

type JuryData = {
  id: string;
  fio: string;
  email: string;
  assigned: number;
  evaluated: number;
  recused: number;
  pending: number;
  avgScore: number | null;
};

const SCORE_COLORS = ["#ff6b6b", "#f5a623", "#e0703a", "#f5c518", "#5b8def", "#8a5cf6", "#2fbf6b"];

function scoreColor(score: number | null): string {
  if (score === null) return C.dim;
  if (score >= 80) return C.green;
  if (score >= 60) return C.amber;
  if (score >= 40) return "#e0703a";
  return C.red;
}

export function JuryChartsCard({ data }: { data: JuryData[] }) {
  if (data.length === 0) {
    return <p style={{ color: C.dim, fontSize: 13, fontFamily: F }}>Нет данных по жюри</p>;
  }

  const maxAssigned = Math.max(1, ...data.map((j) => j.assigned));
  const maxEvaluated = Math.max(1, ...data.map((j) => j.evaluated));

  const totalAssigned = data.reduce((s, j) => s + j.assigned, 0);
  const totalEvaluated = data.reduce((s, j) => s + j.evaluated, 0);
  const totalRecused = data.reduce((s, j) => s + j.recused, 0);
  const avgCompletion = totalAssigned > 0 ? Math.round((totalEvaluated / totalAssigned) * 100) : 0;

  const sorted = [...data].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));

  return (
    <div style={{ fontFamily: F }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Всего жюри", value: data.length, color: C.accent },
          { label: "Назначено", value: totalAssigned, color: C.purple },
          { label: "Оценено", value: totalEvaluated, color: C.green },
          { label: "Выполнение", value: `${avgCompletion}%`, color: avgCompletion >= 70 ? C.green : C.amber },
        ].map((s) => (
          <div key={s.label} style={{ padding: "8px 10px", borderRadius: 7, background: C.card2, border: `1px solid ${C.border}`, textAlign: "center" }}>
            <p style={{ color: s.color, fontSize: 18, fontWeight: 800, margin: 0, fontFamily: MONO }}>{s.value}</p>
            <p style={{ color: C.dim, fontSize: 10, margin: "2px 0 0" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart — workload */}
      <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>Нагрузка по жюри</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((j) => {
          const evalPct = j.assigned > 0 ? Math.round((j.evaluated / j.assigned) * 100) : 0;
          const barWidth = j.assigned > 0 ? Math.round((j.evaluated / maxAssigned) * 100) : 0;
          return (
            <div key={j.id} style={{ padding: "8px 10px", borderRadius: 7, background: C.card2, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent + "20", border: `1px solid ${C.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", color: C.accent, fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                  {j.fio.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.text, fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.fio}</p>
                  <p style={{ color: C.dim, fontSize: 10, margin: "1px 0 0", fontFamily: MONO }}>{j.email}</p>
                </div>
                {j.avgScore !== null && (
                  <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(j.avgScore), fontFamily: MONO }}>{j.avgScore}</span>
                )}
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: C.bg, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", width: `${barWidth}%`, borderRadius: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.green})`, transition: "width 0.3s" }} />
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.dim }}>
                <span>📊 {j.evaluated}/{j.assigned} ({evalPct}%)</span>
                {j.recused > 0 && <span style={{ color: C.amber }}>↩ {j.recused} самоотвод</span>}
                {j.pending > 0 && <span>⏳ {j.pending} ждёт</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
