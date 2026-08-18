"use client";

const F = "var(--font-onest), sans-serif";

export type RegionCount = { region: string; count: number };

// Образец данных для прототипа (в проде — из БД: группировка Application по region).
const SAMPLE: RegionCount[] = [
  { region: "Москва", count: 34 },
  { region: "Республика Татарстан", count: 28 },
  { region: "Санкт-Петербург", count: 24 },
  { region: "Свердловская область", count: 19 },
  { region: "Краснодарский край", count: 17 },
  { region: "Новосибирская область", count: 14 },
  { region: "Ростовская область", count: 12 },
  { region: "Республика Башкортостан", count: 10 },
  { region: "Самарская область", count: 8 },
  { region: "Приморский край", count: 6 },
];

/**
 * Прототип «Заявки по регионам»: горизонтальные бары (топ регионов).
 * Полноценная карта РФ требует SVG-атласа регионов — по желанию добавим.
 */
export function RegionsBars({ data = SAMPLE }: { data?: RegionCount[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count).slice(0, 12);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = data.reduce((s, r) => s + r.count, 0);

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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.region} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#c8c8d0", fontSize: 12.5, width: 190, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.region}
            </span>
            <div style={{ flex: 1, height: 10, background: "#17171d", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.round((r.count / max) * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #0804FF, #7b78ff)",
                  borderRadius: 999,
                }}
              />
            </div>
            <span style={{ color: "#f2f0ec", fontSize: 12.5, fontWeight: 700, width: 28, textAlign: "right" }}>
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
