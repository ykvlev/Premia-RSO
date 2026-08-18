/**
 * Лёгкая наблюдаемость в памяти процесса (без внешнего APM).
 * Кольцевые буферы перф-семплов и ошибок — для дашборда супер-админа.
 * На одиночном инстансе (Reg.ru) этого достаточно; данные живут до перезапуска.
 * Храним на globalThis, чтобы переживать HMR в dev и быть общими для всех модулей.
 */

export type PerfSample = { label: string; ms: number; at: number };
export type ErrorEntry = { message: string; stack?: string; context?: string; at: number };
export type RequestSample = {
  method: string;
  path: string;
  ip?: string;
  ua?: string;
  at: number;
};

type Store = {
  perf: PerfSample[];
  errors: ErrorEntry[];
  requests: RequestSample[];
  startedAt: number;
};

const g = globalThis as unknown as { __obs?: Store };
const store: Store =
  g.__obs ?? (g.__obs = { perf: [], errors: [], requests: [], startedAt: Date.now() });
// Миграция формы стора при HMR со старой версией модуля.
if (!store.requests) store.requests = [];

const PERF_MAX = 300;
const ERR_MAX = 100;
const REQ_MAX = 250;

/** Записать длительность операции (мс). */
export function recordPerf(label: string, ms: number) {
  store.perf.push({ label, ms: Math.round(ms), at: Date.now() });
  if (store.perf.length > PERF_MAX) store.perf.splice(0, store.perf.length - PERF_MAX);
}

/** Обёртка: измерить и записать длительность async-операции. */
export async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = performance.now();
  try {
    return await fn();
  } finally {
    recordPerf(label, performance.now() - t);
  }
}

/** Записать ошибку. */
export function recordError(err: unknown, context?: string) {
  const e = err instanceof Error ? err : new Error(String(err));
  store.errors.push({
    message: e.message.slice(0, 500),
    stack: e.stack?.slice(0, 2000),
    context,
    at: Date.now(),
  });
  if (store.errors.length > ERR_MAX) store.errors.splice(0, store.errors.length - ERR_MAX);
}

/** Записать входящий HTTP-запрос (вызывается из proxy.ts, Node-рантайм). */
export function recordRequest(s: RequestSample) {
  store.requests.push(s);
  if (store.requests.length > REQ_MAX)
    store.requests.splice(0, store.requests.length - REQ_MAX);
}

/** Последние N запросов (свежие сверху). */
export function getRecentRequests(limit = 60): RequestSample[] {
  return [...store.requests].reverse().slice(0, limit);
}

export type RequestStats = {
  total: number;
  windowMinutes: number;
  perMinute: number;
  topPaths: { path: string; count: number }[];
};

/** Сводка по запросам за окно (по умолчанию 15 мин): частота и топ-пути. */
export function getRequestStats(windowMinutes = 15): RequestStats {
  const cutoff = Date.now() - windowMinutes * 60_000;
  const recent = store.requests.filter((r) => r.at >= cutoff);
  const paths = new Map<string, number>();
  for (const r of recent) paths.set(r.path, (paths.get(r.path) ?? 0) + 1);
  const topPaths = [...paths.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return {
    total: recent.length,
    windowMinutes,
    perMinute: +(recent.length / windowMinutes).toFixed(1),
    topPaths,
  };
}

/** Очистить буфер ошибок (действие супер-админа). Возвращает, сколько удалено. */
export function clearErrors(): number {
  const n = store.errors.length;
  store.errors.length = 0;
  return n;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export type PerfStats = {
  count: number;
  avg: number;
  p50: number;
  p95: number;
  max: number;
  windowMinutes: number;
  slowest: PerfSample[];
  byLabel: { label: string; count: number; avg: number; p95: number; max: number }[];
};

/** Сводка по перф-семплам за последние `windowMinutes` минут. */
export function getPerfStats(windowMinutes = 30): PerfStats {
  const cutoff = Date.now() - windowMinutes * 60_000;
  const samples = store.perf.filter((s) => s.at >= cutoff);
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const sum = ms.reduce((a, b) => a + b, 0);

  const groups = new Map<string, number[]>();
  for (const s of samples) {
    const arr = groups.get(s.label) ?? [];
    arr.push(s.ms);
    groups.set(s.label, arr);
  }
  const byLabel = [...groups.entries()]
    .map(([label, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return {
        label,
        count: arr.length,
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        p95: percentile(sorted, 95),
        max: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => b.p95 - a.p95);

  return {
    count: ms.length,
    avg: ms.length ? Math.round(sum / ms.length) : 0,
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    max: ms.length ? ms[ms.length - 1] : 0,
    windowMinutes,
    slowest: [...samples].sort((a, b) => b.ms - a.ms).slice(0, 10),
    byLabel,
  };
}

export function getRecentErrors(limit = 30): ErrorEntry[] {
  return [...store.errors].reverse().slice(0, limit);
}

/** Аптайм наблюдателя (мс) — с момента первого импорта модуля в процессе. */
export function getObserverUptimeMs(): number {
  return Date.now() - store.startedAt;
}
