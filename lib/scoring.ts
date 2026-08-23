/** Централизованная логика подсчёта баллов жюри. */

export type Criterion = {
  key: string;
  label: string;
  maxScore: number;
  weight: number;
  step: number;
};

const FALLBACK: Criterion = { key: "overall", label: "Общая оценка", maxScore: 100, weight: 1, step: 1 };

export function parseCriteria(raw: unknown): Criterion[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: Criterion[] = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key : "";
    if (!key) continue;
    const label = typeof o.label === "string" ? o.label : key;
    const maxScore = typeof o.maxScore === "number" && o.maxScore > 0 ? o.maxScore : 10;
    const weight = typeof o.weight === "number" && o.weight > 0 ? o.weight : 1;
    const step = typeof o.step === "number" && o.step > 0 ? o.step : 1;
    out.push({ key, label, maxScore, weight, step });
  }
  if (out.length === 0) return [FALLBACK];
  return out;
}

function clampStep(value: number, step: number): number {
  const inv = 1 / step;
  return Math.round(value * inv) / inv;
}

export function clampScore(value: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return 0;
  let v = clampStep(value, step);
  v = Math.max(1, Math.min(max, v));
  // fix floating point e.g. 7.5 -> 7.50000001
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 0 : 0;
  return Number(v.toFixed(decimals));
}

export function calcTotal(scores: Record<string, number>, criteria: Criterion[]): number {
  let s = 0;
  for (const c of criteria) s += (Number(scores[c.key]) || 0) * c.weight;
  const d = criteria.some((c) => c.weight !== 1 || c.step !== 1) ? 1 : 0;
  return Number(s.toFixed(d ? 1 : 0));
}

export function calcMaxTotal(criteria: Criterion[]): number {
  let s = 0;
  for (const c of criteria) s += c.maxScore * c.weight;
  return Number(s.toFixed(1));
}

export function calcAvgTotal(totals: number[]): number | null {
  if (totals.length === 0) return null;
  const sum = totals.reduce((a, b) => a + b, 0);
  return Math.round((sum / totals.length) * 10) / 10;
}
