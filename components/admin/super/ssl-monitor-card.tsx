"use client";

import { useState, useEffect } from "react";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = { card2: "#111117", border: "#1d1d25", text: "#f2f0ec", dim: "#6a6a72", muted: "#9a9aa4", green: "#2fbf6b", red: "#ff6b6b", amber: "#f5a623" };

type SSLInfo = {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysLeft: number;
  serialNumber: string;
  error?: string;
};

export function SSLMonitorCard() {
  const [info, setInfo] = useState<SSLInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/super/ssl")
      .then((r) => r.json())
      .then((d) => { setInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: C.dim, fontSize: 12, fontFamily: F }}>Проверяю сертификат...</p>;
  if (!info) return <p style={{ color: C.red, fontSize: 12, fontFamily: F }}>Не удалось получить данные</p>;
  if (info.error) return <p style={{ color: C.red, fontSize: 12, fontFamily: F }}>⚠ {info.error}</p>;

  const statusColor = info.daysLeft > 30 ? C.green : info.daysLeft > 7 ? C.amber : C.red;
  const statusLabel = info.daysLeft > 30 ? "ОК" : info.daysLeft > 7 ? "Скоро истекает" : "КРИТИЧНО";
  const pct = Math.max(0, Math.min(100, (info.daysLeft / 365) * 100));

  return (
    <div style={{ fontFamily: F }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: statusColor + "18",
          border: `2px solid ${statusColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: statusColor, fontFamily: MONO,
        }}>
          {info.daysLeft}
        </div>
        <div>
          <p style={{ color: statusColor, fontSize: 13, fontWeight: 700, margin: 0 }}>{statusLabel}</p>
          <p style={{ color: C.muted, fontSize: 11, margin: "2px 0 0" }}>
            {info.daysLeft > 0 ? `Осталось ${info.daysLeft} дн.` : "Сертификат истёк"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: C.card2, overflow: "hidden", marginBottom: 14, border: `1px solid ${C.border}` }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}88)`, transition: "width 0.5s" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Выдан", value: new Date(info.validFrom).toLocaleDateString("ru-RU") },
          { label: "Истекает", value: new Date(info.validTo).toLocaleDateString("ru-RU") },
          { label: "Издатель", value: info.issuer },
          { label: "Домен", value: info.subject },
        ].map((item) => (
          <div key={item.label} style={{ padding: "6px 8px", borderRadius: 6, background: C.card2, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.dim, fontSize: 9, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>{item.label}</p>
            <p style={{ color: C.text, fontSize: 11.5, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
