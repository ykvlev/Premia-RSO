"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PerfStats, ErrorEntry } from "@/lib/observability";
import { clearErrorBuffer, setSeasonActive, toggleMaintenance, getMaintenanceStatus, addIpBan, removeIpBan, getBanList, testIntegrations, sendMassEmail, impersonateUser, forceLogout, unblockUserSession, banUser, resetUserPassword, exportUserData } from "@/app/admin/super/actions";
import { FeatureFlagsCard } from "@/components/admin/super/feature-flags-card";
import { AdminProfilesCard } from "@/components/admin/super/admin-profiles-card";
import { HeatmapCard } from "@/components/admin/super/heatmap-card";
import { JuryChartsCard } from "@/components/admin/super/jury-charts-card";
import { SSLMonitorCard } from "@/components/admin/super/ssl-monitor-card";
import { DatabaseSchemaViewer } from "@/components/admin/db-schema-viewer";
import { TabNav } from "@/components/admin/super/tab-nav";
import { SecurityCenter } from "@/components/admin/super/security-center";

// ─── Типы данных панели ─────────────────────────────────────────────────────
export type SuperData = {
  generatedAt: number;
  kpi: {
    applications: number;
    applications24h: number;
    evaluations: number;
    recusals: number;
    loginEvents: number;
    appEvents: number;
    seasons: number;
    attachments: number;
    attachmentBytes: number;
    loginOk24: number;
    loginFail24: number;
  };
  byStatus: { status: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  nominations: { title: string; count: number }[];
  perDay: { day: string; count: number }[];
  recentLogins: {
    id: string;
    email: string;
    role: string | null;
    success: boolean;
    reason: string | null;
    ip: string | null;
    userAgent: string | null;
    at: number;
  }[];
  recentEvents: { id: string; actor: string; action: string; at: number }[];
  recentApps: {
    id: string;
    org: string;
    region: string;
    nomination: string;
    status: string;
    at: number;
  }[];
  system: {
    version: string;
    node: string;
    platform: string;
    nodeEnv: string;
    uptimeSec: number;
    hostname: string;
    cpus: number;
    loadavg: number[];
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    totalMemMB: number;
    freeMemMB: number;
    dbPingMs: number;
  };
  features: {
    db: boolean;
    captcha: boolean;
    telegram: boolean;
    mail: boolean;
    storage: boolean;
    dadata: boolean;
  };
  activeSeason: { year: number; startAt: number; endAt: number } | null;
  perf: PerfStats;
  errors: ErrorEntry[];
  users: {
    id: string;
    fio: string;
    email: string;
    role: string;
    createdAt: number;
    lastLogin: number | null;
    perms: string[];
  }[];
  failedByIp: { ip: string; fails: number; total: number; last: number }[];
  requests: { method: string; path: string; ip: string | null; ua: string | null; at: number }[];
  reqStats: {
    total: number;
    windowMinutes: number;
    perMinute: number;
    topPaths: { path: string; count: number }[];
  };
  env: {
    critical: { key: string; set: boolean; secret: boolean; preview: string }[];
    allKeys: string[];
    deps: { name: string; version: string }[];
  };
  seasons: { id: string; year: number; isActive: boolean }[];
  tables: { name: string; count: number }[];
  disk: { totalGB: number; usedGB: number; freeGB: number; pct: number };
  git: { branch: string; commit: string; message: string; author: string; date: string };
  maintenance: { active: boolean; activatedAt: string | null; activatedBy: string | null; reason: string | null };
  bans: { ip: string; reason: string; bannedBy: string; bannedAt: string }[];
  sessions: { id: string; email: string; userId: string | null; role: string | null; ip: string | null; userAgent: string | null; loginAt: string; blocked: boolean }[];
  auditLogs: { id: string; actor: string; action: string; target: string | null; detail: any; ip: string | null; createdAt: Date }[];
  dbHealth: { tables: { name: string; count: number; size: string }[]; totalSize: string };
  regPerDay: { day: string; count: number }[];
  adminProfiles: { id: string; fio: string; email: string; phone: string | null; role: string; createdAt: string }[];
  heatmapData: { date: string; count: number }[];
  juryChartsData: { id: string; fio: string; email: string; assigned: number; evaluated: number; recused: number; pending: number; avgScore: number | null }[];
};

// ─── Токены темы ────────────────────────────────────────────────────────────
const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = {
  bg: "#08080a",
  card: "#0e0e12",
  card2: "#121216",
  border: "#22222a",
  text: "#f2f0ec",
  muted: "#9a9aa4",
  dim: "#6a6a72",
  accent: "#0804ff",
  green: "#2fbf6b",
  red: "#ff6b6b",
  amber: "#f5a623",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Отправлена",
  queued: "В очереди",
  review: "На рассмотрении",
  revision: "Доработка",
  scoring: "На оценке",
  finalist: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};
const STATUS_COLOR: Record<string, string> = {
  new: "#5b8def",
  queued: "#9a9aa4",
  review: "#f5a623",
  revision: "#e0703a",
  scoring: "#8a5cf6",
  finalist: "#2fbf6b",
  winner: "#f5c518",
  rejected: "#ff6b6b",
};
const ROLE_LABEL: Record<string, string> = {
  participant: "Участники",
  jury: "Жюри",
  admin: "Админы",
  superadmin: "Супер-админы",
};
const REASON_LABEL: Record<string, string> = {
  no_user: "нет пользователя",
  bad_password: "неверный пароль",
  bad_input: "некорректный ввод",
  rate_limited: "лимит попыток",
};

// ─── Форматтеры ─────────────────────────────────────────────────────────────
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function fmtAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s} с назад`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}
function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}д` : "", h ? `${h}ч` : "", `${m}м`].filter(Boolean).join(" ");
}
function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function msColor(ms: number): string {
  if (ms < 0) return C.red;
  if (ms < 120) return C.green;
  if (ms < 400) return C.amber;
  return C.red;
}

// ─── Мелкие компоненты ──────────────────────────────────────────────────────
function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <h2
          style={{
            color: C.muted,
            fontSize: 11,
            fontFamily: F,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.9px",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: C.card2,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "0 0 8px", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ color: color ?? C.text, fontSize: 26, fontFamily: F, fontWeight: 800, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ color: C.dim, fontSize: 12, fontFamily: F, margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: color + "22",
        color,
        border: `1px solid ${color}55`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontFamily: F,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ color: C.muted, fontSize: 12.5, fontFamily: F, width: 130, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 8, background: "#1a1a20", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
      <span style={{ color: C.text, fontSize: 12.5, fontFamily: MONO, width: 34, textAlign: "right", flexShrink: 0 }}>
        {count}
      </span>
    </div>
  );
}

function FeatureDot({ on, label }: { on: boolean; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: C.card2,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "9px 12px",
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: on ? C.green : C.dim,
          boxShadow: on ? `0 0 8px ${C.green}88` : "none",
          flexShrink: 0,
        }}
      />
      <span style={{ color: on ? C.text : C.dim, fontSize: 12.5, fontFamily: F, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ marginLeft: "auto", color: on ? C.green : C.dim, fontSize: 11, fontFamily: F }}>
        {on ? "вкл" : "выкл"}
      </span>
    </div>
  );
}

const th: React.CSSProperties = {
  color: C.dim,
  fontSize: 10.5,
  fontFamily: F,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  textAlign: "left",
  padding: "6px 10px",
  borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  color: C.text,
  fontSize: 12.5,
  fontFamily: F,
  padding: "8px 10px",
  borderBottom: `1px solid #17171d`,
  verticalAlign: "top",
};

function Scroll({ children, max = 320 }: { children: React.ReactNode; max?: number }) {
  return <div style={{ maxHeight: max, overflow: "auto", margin: "0 -6px" }}>{children}</div>;
}

const exportBtn: React.CSSProperties = {
  background: C.card2,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "8px 13px",
  fontSize: 12.5,
  fontFamily: F,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

// ═══════════════════════════════════════════════════════════════════════════
// IP Ban Section
// ═══════════════════════════════════════════════════════════════════════════
function IpBanSection({ bans }: { bans: { ip: string; reason: string; bannedBy: string; bannedAt: string }[] }) {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [list, setList] = useState(bans);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const doBan = async () => {
    if (!ip.trim()) return;
    setBusy(true);
    setMsg(null);
    const { addIpBan } = await import("@/app/admin/super/actions");
    const res = await addIpBan(ip.trim(), reason.trim());
    setBusy(false);
    if (res.ok) {
      setList([...list, { ip: ip.trim(), reason: reason.trim() || "Banned", bannedBy: "superadmin", bannedAt: new Date().toISOString() }]);
      setIp(""); setReason(""); setMsg("Заблокирован");
    } else {
      setMsg(res.error || "Ошибка");
    }
  };

  const doUnban = async (bannedIp: string) => {
    setBusy(true);
    const { removeIpBan } = await import("@/app/admin/super/actions");
    const res = await removeIpBan(bannedIp);
    setBusy(false);
    if (res.ok) setList(list.filter((b) => b.ip !== bannedIp));
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="IP или CIDR (1.2.3.0/24)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: MONO, fontSize: 13 }}
        />
        <input
          placeholder="Причина..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: F, fontSize: 13 }}
        />
        <button
          onClick={doBan}
          disabled={busy || !ip.trim()}
          style={{
            background: busy || !ip.trim() ? C.card2 : "#ff3b30",
            color: busy || !ip.trim() ? C.dim : "#fff",
            border: `1px solid ${busy || !ip.trim() ? C.border : "#ff3b30"}`,
            borderRadius: 7,
            padding: "7px 14px",
            fontSize: 12.5,
            fontFamily: F,
            fontWeight: 700,
            cursor: busy || !ip.trim() ? "default" : "pointer",
          }}
        >
          + Забанить
        </button>
      </div>
      {msg && <p style={{ color: msg.includes("Ошибка") ? C.red : C.green, fontSize: 12, margin: "0 0 8px" }}>{msg}</p>}
      {list.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 12.5, fontStyle: "italic" }}>Нет забаненных IP</p>
      ) : (
        <Scroll max={220}>
          {list.map((b) => (
            <div key={b.ip} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{b.ip}</span>
                <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{b.reason}</span>
              </div>
              <button
                onClick={() => doUnban(b.ip)}
                disabled={busy}
                style={{ background: "none", color: C.green, border: "none", fontSize: 12, fontFamily: F, fontWeight: 600, cursor: "pointer" }}
              >
                Убрать
              </button>
            </div>
          ))}
        </Scroll>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Integration Test Card
// ═══════════════════════════════════════════════════════════════════════════
function IntegrationTestCard() {
  const [result, setResult] = useState<{ smtp: { ok: boolean; detail: string }; telegram: { ok: boolean; detail: string }; s3: { ok: boolean; detail: string } } | null>(null);
  const [busy, setBusy] = useState(false);

  const doTest = async () => {
    setBusy(true);
    const { testIntegrations } = await import("@/app/admin/super/actions");
    const res = await testIntegrations();
    setResult(res);
    setBusy(false);
  };

  const Item = ({ label, ok, detail }: { label: string; ok: boolean; detail: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: ok ? C.green : "#ff3b30", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, fontFamily: F, fontSize: 13 }}>{label}</span>
        <span style={{ color: C.muted, fontSize: 12, marginLeft: 8, fontFamily: MONO }}>{detail}</span>
      </div>
      <Badge color={ok ? C.green : "#ff3b30"}>{ok ? "OK" : "FAIL"}</Badge>
    </div>
  );

  return (
    <div>
      <button
        onClick={doTest}
        disabled={busy}
        style={{
          ...exportBtn,
          background: busy ? C.card2 : C.accent,
          color: busy ? C.dim : "#fff",
          border: `1px solid ${busy ? C.border : C.accent}`,
          marginBottom: 12,
        }}
      >
        {busy ? "Проверяю..." : "Проверить все"}
      </button>
      {result && (
        <div>
          <Item label="SMTP" ok={result.smtp.ok} detail={result.smtp.detail} />
          <Item label="Telegram" ok={result.telegram.ok} detail={result.telegram.detail} />
          <Item label="S3 Storage" ok={result.s3.ok} detail={result.s3.detail} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Mass Email Card
// ═══════════════════════════════════════════════════════════════════════════
function MassEmailCard() {
  const [target, setTarget] = useState<"all" | "participants" | "jury" | "admins" | "test">("test");
  const [mode, setMode] = useState<"email" | "profile">("profile");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const doSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    if (target === "test" && mode === "email" && !testEmail.trim()) return;
    setBusy(true);
    setResult(null);

    if (mode === "profile") {
      const { sendProfileNotifications } = await import("@/lib/notifications/actions");
      const res = await sendProfileNotifications(subject.trim(), body.trim(), target === "test" ? "all" : target as any);
      setBusy(false);
      setResult(res.ok ? `Уведомления доставлены ${res.sent} пользователям` : res.error || "Ошибка");
      return;
    }

    if (target === "test") {
      const { sendTestEmail } = await import("@/app/admin/super/actions");
      const res = await sendTestEmail(testEmail.trim(), subject.trim(), body.trim());
      setBusy(false);
      setResult(res.ok ? `Тестовое письмо отправлено на ${testEmail.trim()}` : `Ошибка: ${res.error}`);
      return;
    }

    const { sendMassEmail } = await import("@/app/admin/super/actions");
    const res = await sendMassEmail(subject.trim(), body.trim(), target as any);
    setBusy(false);
    setResult(res.ok ? `Отправлено ${res.sent} писем` : res.error || "Ошибка");
  };

  const targets = [
    { v: "test", l: "Тест" },
    { v: "all", l: "Все" },
    { v: "participants", l: "Участники" },
    { v: "jury", l: "Жюри" },
    { v: "admins", l: "Админы" },
  ] as const;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button
          onClick={() => setMode("profile")}
          style={{
            flex: 1,
            background: mode === "profile" ? C.green : C.card2,
            color: mode === "profile" ? "#fff" : C.muted,
            border: `1px solid ${mode === "profile" ? C.green : C.border}`,
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: F,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          В профиль
        </button>
        <button
          onClick={() => setMode("email")}
          style={{
            flex: 1,
            background: mode === "email" ? C.accent : C.card2,
            color: mode === "email" ? "#fff" : C.muted,
            border: `1px solid ${mode === "email" ? C.accent : C.border}`,
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: F,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          На почту
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {targets.map((t) => (
          <button
            key={t.v}
            onClick={() => setTarget(t.v)}
            style={{
              background: target === t.v ? C.accent : C.card2,
              color: target === t.v ? "#fff" : C.muted,
              border: `1px solid ${target === t.v ? C.accent : C.border}`,
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11.5,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t.l}
          </button>
        ))}
      </div>
      {target === "test" && mode === "email" && (
        <input
          placeholder="Тестовый email (реальный!)"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: MONO, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
        />
      )}
      <input
        placeholder="Заголовок"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: F, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
      />
      <textarea
        placeholder="Текст уведомления..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: F, fontSize: 13, marginBottom: 8, resize: "vertical", boxSizing: "border-box" }}
      />
      <button
        onClick={doSend}
        disabled={busy || !subject.trim() || !body.trim() || (target === "test" && mode === "email" && !testEmail.trim())}
        style={{
          ...exportBtn,
          background: busy || !subject.trim() || !body.trim() || (target === "test" && mode === "email" && !testEmail.trim()) ? C.card2 : (mode === "profile" ? C.green : C.accent),
          color: busy || !subject.trim() || !body.trim() || (target === "test" && mode === "email" && !testEmail.trim()) ? C.dim : "#fff",
          border: `1px solid ${busy || !subject.trim() || !body.trim() || (target === "test" && mode === "email" && !testEmail.trim()) ? C.border : (mode === "profile" ? C.green : C.accent)}`,
        }}
      >
        {busy ? "Отправляю..." : mode === "profile" ? "Отправить в профиль" : target === "test" ? "Тестовое письмо" : "Отправить по почте"}
      </button>
      {result && (
        <p style={{ color: result.includes("Ошибка") ? C.red : C.green, fontSize: 12, marginTop: 8 }}>{result}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Impersonation Card
// ═══════════════════════════════════════════════════════════════════════════
function ImpersonationCard({ users }: { users: { id: string; fio: string; email: string; role: string }[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doImpersonate = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    const { impersonateUser } = await import("@/app/admin/super/actions");
    const res = await impersonateUser(selectedId);
    setBusy(false);
    if (res.ok && res.token) {
      // Редиректим на серверный роут — он установит httpOnly cookie
      window.location.href = `/admin/super/impersonate?token=${encodeURIComponent(res.token)}`;
    } else {
      setError(res.error || "Ошибка");
    }
  };

  return (
    <div>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
        Выберите пользователя для входа от его лица. Токен действителен 1 час.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            flex: 1,
            background: C.card2,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            padding: "7px 10px",
            color: C.text,
            fontFamily: F,
            fontSize: 13,
          }}
        >
          <option value="">— Выберите —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fio || u.email || u.id} ({u.role})
            </option>
          ))}
        </select>
        <button
          onClick={doImpersonate}
          disabled={busy || !selectedId}
          style={{
            background: busy || !selectedId ? C.card2 : "#ff9500",
            color: busy || !selectedId ? C.dim : "#fff",
            border: `1px solid ${busy || !selectedId ? C.border : "#ff9500"}`,
            borderRadius: 7,
            padding: "7px 14px",
            fontSize: 12.5,
            fontFamily: F,
            fontWeight: 700,
            cursor: busy || !selectedId ? "default" : "pointer",
          }}
        >
          {busy ? "..." : "Войти"}
        </button>
      </div>
      {error && <p style={{ color: C.red, fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sessions Card — активные сессии + force-logout
// ═══════════════════════════════════════════════════════════════════════════
function SessionsCard({ sessions }: { sessions: { id: string; email: string; userId: string | null; role: string | null; ip: string | null; userAgent: string | null; loginAt: string; blocked: boolean }[] }) {
  const [list, setList] = useState(sessions);
  const [busy, setBusy] = useState(false);

  const doForceLogout = async (userId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    const { forceLogout } = await import("@/app/admin/super/actions");
    const res = await forceLogout(userId, "Force logout");
    setBusy(false);
    if (res.ok) {
      setList(list.map((s) => s.userId === userId ? { ...s, blocked: true } : s));
    }
  };

  const doUnblock = async (userId: string) => {
    if (!userId || busy) return;
    setBusy(true);
    const { unblockUserSession } = await import("@/app/admin/super/actions");
    await unblockUserSession(userId);
    setBusy(false);
    setList(list.map((s) => s.userId === userId ? { ...s, blocked: false } : s));
  };

  const parseUA = (ua: string | null) => {
    if (!ua) return "—";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return ua.slice(0, 30);
  };

  return (
    <div>
      {list.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 12.5, fontStyle: "italic" }}>Нет активных сессий (за 2ч)</p>
      ) : (
        <Scroll max={280}>
          {list.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.blocked ? "#ff3b30" : C.green, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: F, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.email}
                  <span style={{ color: C.dim, fontSize: 11, fontWeight: 400, marginLeft: 6 }}>{s.role}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: MONO, display: "flex", gap: 12 }}>
                  <span>{s.ip ?? "—"}</span>
                  <span>{parseUA(s.userAgent)}</span>
                  <span>{new Date(s.loginAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              {s.userId && (
                s.blocked ? (
                  <button
                    onClick={() => doUnblock(s.userId!)}
                    disabled={busy}
                    style={{ background: "none", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: F, fontWeight: 600, cursor: "pointer" }}
                  >
                    Разблок.
                  </button>
                ) : (
                  <button
                    onClick={() => doForceLogout(s.userId!)}
                    disabled={busy}
                    style={{ background: "none", color: "#ff3b30", border: `1px solid #ff3b3044`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: F, fontWeight: 600, cursor: "pointer" }}
                  >
                    Kick
                  </button>
                )
              )}
            </div>
          ))}
        </Scroll>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Live Logs Card — SSE-стрим логов в реальном времени
// ═══════════════════════════════════════════════════════════════════════════
function LiveLogsCard() {
  const [entries, setEntries] = useState<{ type: string; method?: string; path?: string; ip?: string; message?: string; context?: string; at: number }[]>([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const es = new EventSource("/api/admin/super/logs");

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "init") {
          setEntries(data.entries);
        } else if (data.type === "update") {
          setEntries((prev) => {
            const merged = [...data.entries, ...prev];
            const seen = new Set<string>();
            return merged.filter((e: any) => {
              const k = `${e.at}-${e.type}-${e.path ?? e.message}`;
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            }).slice(0, 80);
          });
        }
      } catch { /* skip */ }
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries]);

  const timeStr = (at: number) => new Date(at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: connected ? C.green : "#ff3b30",
          boxShadow: connected ? `0 0 6px ${C.green}88` : "none",
        }} />
        <span style={{ fontSize: 11, color: C.dim, fontFamily: F }}>
          {connected ? "Live" : "Disconnected"}
        </span>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: MONO, marginLeft: "auto" }}>{entries.length} entries</span>
      </div>
      <div ref={scrollRef} style={{ maxHeight: 260, overflow: "auto", fontFamily: MONO, fontSize: 11 }}>
        {entries.length === 0 ? (
          <p style={{ color: C.muted, fontStyle: "italic", fontFamily: F }}>Ожидание событий...</p>
        ) : (
          entries.map((e, i) => (
            <div key={`${e.at}-${i}`} style={{
              display: "flex", gap: 8, padding: "3px 0",
              borderBottom: `1px solid ${C.border}`,
              color: e.type === "error" ? C.red : C.text,
            }}>
              <span style={{ color: C.dim, flexShrink: 0 }}>{timeStr(e.at)}</span>
              {e.type === "request" ? (
                <>
                  <span style={{ color: e.method === "GET" ? C.green : e.method === "POST" ? "#ff9500" : C.accent, fontWeight: 600, flexShrink: 0, width: 36 }}>{e.method}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.path}</span>
                  <span style={{ color: C.dim, flexShrink: 0 }}>{e.ip}</span>
                </>
              ) : (
                <>
                  <span style={{ color: C.red, fontWeight: 600, flexShrink: 0 }}>ERR</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</span>
                  {e.context && <span style={{ color: C.dim, flexShrink: 0 }}>[{e.context}]</span>}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// System Monitor — live CPU/RAM/disk через SSE
// ═══════════════════════════════════════════════════════════════════════════
function SystemMonitorCard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/admin/super/metrics");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (ev) => {
      try { setMetrics(JSON.parse(ev.data)); } catch {}
    };
    return () => es.close();
  }, []);

  if (!metrics) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? C.green : "#ff3b30", boxShadow: connected ? `0 0 6px ${C.green}88` : "none" }} />
          <span style={{ fontSize: 11, color: C.dim, fontFamily: F }}>{connected ? "Live" : "Connecting..."}</span>
        </div>
        <p style={{ color: C.dim, fontSize: 12, fontStyle: "italic", fontFamily: F }}>Загрузка метрик...</p>
      </div>
    );
  }

  const cpuPct = metrics.cpu.loadavg[0] / metrics.cpu.cores * 100;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}88` }} />
        <span style={{ fontSize: 11, color: C.green, fontFamily: F }}>Live</span>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: MONO, marginLeft: "auto" }}>каждые 3 сек</span>
      </div>

      {/* CPU */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontFamily: F, color: C.muted, fontWeight: 600 }}>CPU</span>
          <span style={{ fontSize: 12, fontFamily: MONO, color: cpuPct > 80 ? C.red : cpuPct > 50 ? C.amber : C.green }}>{cpuPct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 6, background: "#1a1a20", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, cpuPct)}%`, background: cpuPct > 80 ? C.red : cpuPct > 50 ? C.amber : C.green, borderRadius: 999, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{metrics.cpu.cores} cores</span>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>load {metrics.cpu.loadavg.join(" / ")}</span>
        </div>
      </div>

      {/* RAM */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontFamily: F, color: C.muted, fontWeight: 600 }}>RAM</span>
          <span style={{ fontSize: 12, fontFamily: MONO, color: metrics.memory.usedPct > 90 ? C.red : metrics.memory.usedPct > 75 ? C.amber : C.green }}>{metrics.memory.usedPct}%</span>
        </div>
        <div style={{ height: 6, background: "#1a1a20", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${metrics.memory.usedPct}%`, background: metrics.memory.usedPct > 90 ? C.red : metrics.memory.usedPct > 75 ? C.amber : C.green, borderRadius: 999, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{metrics.memory.freeMB} MB free</span>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{metrics.memory.totalMB} MB total</span>
        </div>
      </div>

      {/* Disk */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontFamily: F, color: C.muted, fontWeight: 600 }}>Disk</span>
          <span style={{ fontSize: 12, fontFamily: MONO, color: metrics.disk.pct > 90 ? C.red : metrics.disk.pct > 75 ? C.amber : C.green }}>{metrics.disk.pct}%</span>
        </div>
        <div style={{ height: 6, background: "#1a1a20", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${metrics.disk.pct}%`, background: metrics.disk.pct > 90 ? C.red : metrics.disk.pct > 75 ? C.amber : C.green, borderRadius: 999, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{metrics.disk.freeGB} GB free</span>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{metrics.disk.totalGB} GB total</span>
        </div>
      </div>

      {/* Process */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>RSS</span>
          <p style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, margin: "2px 0 0" }}>{metrics.memory.rssMB} MB</p>
        </div>
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>Heap</span>
          <p style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, margin: "2px 0 0" }}>{metrics.memory.heapUsedMB}/{metrics.memory.heapTotalMB} MB</p>
        </div>
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>Uptime</span>
          <p style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, margin: "2px 0 0" }}>{fmtUptime(metrics.pm2.uptime)}</p>
        </div>
        <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px" }}>
          <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>Platform</span>
          <p style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, margin: "2px 0 0" }}>{metrics.node}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit Log Card
// ═══════════════════════════════════════════════════════════════════════════
const ACTION_LABEL: Record<string, string> = {
  ban_ip: "Забанил IP",
  unban_ip: "Разбанил IP",
  maintenance_on: "Включил обслуживание",
  maintenance_off: "Выключил обслуживание",
  impersonate: "Вход от лица",
  force_logout: "Force logout",
  mass_email: "Массовая рассылка",
  mass_notify: "Массовые уведомления",
  reset_password: "Сброс пароля",
  ban_user: "Забанил пользователя",
  unban_user: "Разбанил пользователя",
  export_user_data: "Экспорт данных",
};
function AuditLogCard({ logs }: { logs: { id: string; actor: string; action: string; target: string | null; detail: any; ip: string | null; createdAt: Date }[] }) {
  return (
    <div>
      {logs.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 12.5, fontStyle: "italic", fontFamily: F }}>Нет записей</p>
      ) : (
        <Scroll max={280}>
          {logs.map((l) => (
            <div key={l.id} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge color={l.action.includes("ban") ? C.red : l.action.includes("maintenance") ? C.amber : C.accent}>
                  {ACTION_LABEL[l.action] ?? l.action}
                </Badge>
                {l.target && (
                  <span style={{ fontSize: 11, fontFamily: MONO, color: C.dim }}>
                    {l.target.length > 12 ? l.target.slice(0, 12) + "…" : l.target}
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim, fontFamily: F, whiteSpace: "nowrap" }}>
                  {fmtAgo(new Date(l.createdAt).getTime(), Date.now())}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: F, marginTop: 2 }}>
                {l.actor}
                {l.detail && typeof l.detail === "object" && (
                  <span style={{ marginLeft: 6, fontFamily: MONO, fontSize: 10 }}>
                    {l.detail.reason ? `причина: ${l.detail.reason}` : ""}
                    {l.detail.sent ? `→ ${l.detail.sent} получателей` : ""}
                    {l.detail.email ? `(${l.detail.email})` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Scroll>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick User Actions Card
// ═══════════════════════════════════════════════════════════════════════════
function UserActionsCard({ users }: { users: { id: string; fio: string; email: string; role: string }[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultColor, setResultColor] = useState(C.green);

  function flash(text: string, color = C.green) {
    setResult(text);
    setResultColor(color);
    setTimeout(() => setResult(null), 4000);
  }

  const doBan = async () => {
    if (!selectedId) return;
    const reason = prompt("Причина бана:");
    if (!reason) return;
    setBusy(true);
    const { banUser } = await import("@/app/admin/super/actions");
    const res = await banUser(selectedId, reason);
    setBusy(false);
    if (res.ok) flash("Пользователь заблокирован");
    else flash(res.error || "Ошибка", C.red);
  };

  const doResetPassword = async () => {
    if (!selectedId) return;
    if (!confirm("Сгенерировать новый пароль для пользователя?")) return;
    setBusy(true);
    const { resetUserPassword } = await import("@/app/admin/super/actions");
    const res = await resetUserPassword(selectedId);
    setBusy(false);
    if (res.ok && res.code) flash(`Новый пароль: ${res.code}`, C.green);
    else flash(res.error || "Ошибка", C.red);
  };

  const doExport = async () => {
    if (!selectedId) return;
    setBusy(true);
    const { exportUserData } = await import("@/app/admin/super/actions");
    const res = await exportUserData(selectedId);
    setBusy(false);
    if (res.ok && res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-${res.data.email}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("Данные экспортированы");
    } else {
      flash(res.error || "Ошибка", C.red);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontFamily: F, fontSize: 13 }}
        >
          <option value="">— Выберите пользователя —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fio || u.email} ({u.role})
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          onClick={doBan}
          disabled={busy || !selectedId}
          style={{
            ...exportBtn,
            background: busy || !selectedId ? C.card2 : "#ff3b3018",
            color: busy || !selectedId ? C.dim : "#ff3b30",
            border: `1px solid ${busy || !selectedId ? C.border : "#ff3b3055"}`,
            cursor: busy || !selectedId ? "default" : "pointer",
          }}
        >
          Забанить
        </button>
        <button
          onClick={doResetPassword}
          disabled={busy || !selectedId}
          style={{
            ...exportBtn,
            background: busy || !selectedId ? C.card2 : C.amber + "18",
            color: busy || !selectedId ? C.dim : C.amber,
            border: `1px solid ${busy || !selectedId ? C.border : C.amber + "55"}`,
            cursor: busy || !selectedId ? "default" : "pointer",
          }}
        >
          Сбросить пароль
        </button>
        <button
          onClick={doExport}
          disabled={busy || !selectedId}
          style={{
            ...exportBtn,
            background: busy || !selectedId ? C.card2 : C.accent + "18",
            color: busy || !selectedId ? C.dim : "#c9d1ff",
            border: `1px solid ${busy || !selectedId ? C.border : C.accent + "55"}`,
            cursor: busy || !selectedId ? "default" : "pointer",
          }}
        >
          Экспорт данных
        </button>
      </div>
      {result && (
        <p style={{ color: resultColor, fontSize: 12, fontFamily: MONO, marginTop: 8, wordBreak: "break-all" }}>{result}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration Analytics Card
// ═══════════════════════════════════════════════════════════════════════════
function RegistrationAnalyticsCard({ data }: { data: { regPerDay: { day: string; count: number }[] } }) {
  const max = Math.max(1, ...data.regPerDay.map((x) => x.count));
  return (
    <div>
      {data.regPerDay.length === 0 ? (
        <p style={{ color: C.dim, fontSize: 12.5, fontStyle: "italic", fontFamily: F }}>Нет данных за 30 дней</p>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
          {data.regPerDay.map((d) => (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ color: C.dim, fontSize: 9, fontFamily: MONO }}>{d.count || ""}</span>
              <div
                title={`${d.day}: ${d.count}`}
                style={{
                  width: "100%",
                  height: `${Math.max(3, (d.count / max) * 70)}px`,
                  background: `linear-gradient(180deg, ${C.green}, ${C.green}66)`,
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <span style={{ color: C.dim, fontSize: 8, fontFamily: MONO }}>{d.day.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Database Health Card
// ═══════════════════════════════════════════════════════════════════════════
function DbHealthCard({ dbHealth }: { dbHealth: { tables: { name: string; count: number; size: string }[]; totalSize: string } }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Badge color={C.green}>Размер БД: {dbHealth.totalSize}</Badge>
      </div>
      {dbHealth.tables.length === 0 ? (
        <p style={{ color: C.dim, fontSize: 12.5, fontStyle: "italic", fontFamily: F }}>Нет данных</p>
      ) : (
        <Scroll max={240}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Таблица</th>
                <th style={{ ...th, textAlign: "right" }}>Строк</th>
                <th style={{ ...th, textAlign: "right" }}>Размер</th>
              </tr>
            </thead>
            <tbody>
              {dbHealth.tables.map((t) => (
                <tr key={t.name}>
                  <td style={{ ...td, fontFamily: MONO, fontSize: 12, color: C.muted }}>{t.name}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>{t.count.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: C.dim }}>{t.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Email Queue Card
// ═══════════════════════════════════════════════════════════════════════════
function EmailQueueCard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async (status = filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/super/email-log?status=${status}&limit=30`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setStats({ total: data.total ?? 0, sent: data.sent ?? 0, failed: data.failed ?? 0 });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {(["all", "sent", "failed"] as const).map((s) => (
          <button key={s} onClick={() => { setFilter(s); load(s); }} style={{
            background: filter === s ? C.accent : C.card2,
            color: filter === s ? "#fff" : C.muted,
            border: `1px solid ${filter === s ? C.accent : C.border}`,
            borderRadius: 6, padding: "4px 10px", fontSize: 11.5, fontFamily: F, fontWeight: 600, cursor: "pointer",
          }}>
            {s === "all" ? `Все (${stats.total})` : s === "sent" ? `Отправлено (${stats.sent})` : `Ошибки (${stats.failed})`}
          </button>
        ))}
      </div>
      {loading ? (
        <p style={{ color: C.dim, fontSize: 12, fontFamily: F }}>Загрузка...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: C.dim, fontSize: 12, fontFamily: F, fontStyle: "italic" }}>Пока нет записей</p>
      ) : (
        <Scroll max={260}>
          {logs.map((l: any) => (
            <div key={l.id} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge color={l.status === "sent" ? C.green : C.red}>{l.status}</Badge>
                <span style={{ fontSize: 12, fontFamily: F, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: MONO, marginTop: 2 }}>
                {l.to} · {fmtAgo(new Date(l.createdAt).getTime(), Date.now())}
              </div>
              {l.error && <div style={{ fontSize: 10, color: C.red, fontFamily: MONO, marginTop: 2 }}>{l.error}</div>}
            </div>
          ))}
        </Scroll>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DB Backup Card
// ═══════════════════════════════════════════════════════════════════════════
function DbBackupCard() {
  const [backups, setBackups] = useState<{ name: string; size: number; date: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/super/db-backup").then(r => r.json()).then(d => setBackups(d.backups ?? [])).catch(() => {});
  }, []);

  const doBackup = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/super/db-backup", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMsg(`Бэкап создан: ${data.filename} (${fmtBytes(data.size)})`);
        setBackups([{ name: data.filename, size: data.size, date: new Date().toISOString() }, ...backups]);
      } else {
        setMsg(`Ошибка: ${data.error}`);
      }
    } catch (e: any) {
      setMsg(`Ошибка: ${e.message}`);
    }
    setBusy(false);
  };

  return (
    <div>
      <button onClick={doBackup} disabled={busy} style={{
        ...exportBtn,
        background: busy ? C.card2 : C.green,
        color: busy ? C.dim : "#fff",
        border: `1px solid ${busy ? C.border : C.green}`,
        marginBottom: 12, cursor: busy ? "default" : "pointer",
      }}>
        {busy ? "Создаю бэкап..." : "Создать бэкап PostgreSQL"}
      </button>
      {msg && <p style={{ color: msg.includes("Ошибка") ? C.red : C.green, fontSize: 12, fontFamily: F, margin: "0 0 8px" }}>{msg}</p>}
      {backups.length === 0 ? (
        <p style={{ color: C.dim, fontSize: 12, fontFamily: F, fontStyle: "italic" }}>Бэкапов пока нет</p>
      ) : (
        <Scroll max={200}>
          {backups.map((b) => (
            <div key={b.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.text }}>{b.name}</span>
                <span style={{ color: C.dim, fontSize: 11, marginLeft: 8 }}>{fmtBytes(b.size)}</span>
              </div>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: F }}>{fmtAgo(new Date(b.date).getTime(), Date.now())}</span>
            </div>
          ))}
        </Scroll>
      )}
    </div>
  );
}

// ─── Основной дашборд ───────────────────────────────────────────────────────
export function SuperDashboard({ data }: { data: SuperData }) {
  const router = useRouter();
  const [now, setNow] = useState(data.generatedAt);
  const [auto, setAuto] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // тикаем «сейчас» только после монтирования — без гидрационного рассинхрона
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // авто-обновление данных с сервера
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setRefreshing(true);
      router.refresh();
      setTimeout(() => setRefreshing(false), 800);
    }, 10_000);
    return () => clearInterval(t);
  }, [auto, router]);

  const s = data.system;
  const k = data.kpi;
  const memPct = s.totalMemMB > 0 ? Math.round(((s.totalMemMB - s.freeMemMB) / s.totalMemMB) * 100) : 0;
  const statusMax = Math.max(1, ...data.byStatus.map((x) => x.count));
  const roleMax = Math.max(1, ...data.usersByRole.map((x) => x.count));
  const nomMax = Math.max(1, ...data.nominations.map((x) => x.count));
  const dayMax = Math.max(1, ...data.perDay.map((x) => x.count));

  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [showEnvKeys, setShowEnvKeys] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(data.maintenance.active);
  const [maintPending, setMaintPending] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  }
  function doClearErrors() {
    startTransition(async () => {
      const r = await clearErrorBuffer();
      flash(`Буфер очищен: ${r.cleared} записей`);
      router.refresh();
    });
  }
  function doToggleSeason(id: string, next: boolean) {
    startTransition(async () => {
      const r = await setSeasonActive(id, next);
      flash(r.ok ? (next ? "Сезон активирован" : "Сезон выключен") : r.error ?? "Ошибка");
      router.refresh();
    });
  }
  async function doToggleMaintenance(enable: boolean) {
    setMaintPending(true);
    const r = await toggleMaintenance(enable, enable ? "DDoS protection" : undefined);
    if (r.ok) {
      setMaintenanceActive(r.active);
      flash(r.active ? "🔒 Сайт заблокирован" : "🔓 Сайт разблокирован");
    } else {
      flash(r.error ?? "Ошибка");
    }
    setMaintPending(false);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `super-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const roleColor = (role: string) =>
    role === "superadmin" ? C.accent : role === "jury" ? "#8a5cf6" : role === "admin" ? "#5b8def" : C.muted;

  return (
    <main style={{ flex: 1, minHeight: "100vh", background: C.bg, fontFamily: F }}>
      {/* Шапка */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(8,8,10,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: F,
              fontWeight: 800,
              letterSpacing: "1px",
              color: C.accent,
              border: `1px solid ${C.accent}66`,
              borderRadius: 6,
              padding: "3px 8px",
              textTransform: "uppercase",
            }}
          >
            Super
          </span>
          <div>
            <p style={{ color: C.text, fontSize: 16, fontWeight: 800, margin: 0 }}>
              Панель системы
            </p>
            <p style={{ color: C.dim, fontSize: 11.5, margin: "2px 0 0" }}>
              обновлено {fmtAgo(data.generatedAt, now)} · v{s.version} · {s.nodeEnv}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setAuto((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: auto ? C.green + "18" : C.card2,
              color: auto ? C.green : C.muted,
              border: `1px solid ${auto ? C.green + "55" : C.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: auto ? C.green : C.dim,
                animation: auto ? "pulse 1.6s infinite" : "none",
              }}
            />
            Авто {auto ? "вкл" : "выкл"}
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              router.refresh();
              setTimeout(() => setRefreshing(false), 800);
            }}
            style={{
              background: C.card2,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            {refreshing ? "Обновляю…" : "Обновить"}
          </button>
          <Link
            href="/admin/super/nominations"
            style={{
              color: "#c9d1ff",
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              textDecoration: "none",
              border: `1px solid ${C.accent}55`,
              background: `${C.accent}14`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            Номинации и поля
          </Link>
          <Link
            href="/admin"
            style={{
              color: C.muted,
              fontSize: 12.5,
              fontFamily: F,
              fontWeight: 600,
              textDecoration: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            ← Админка
          </Link>
        </div>
      </header>

      {/* Tab Navigation */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "6px 24px 0",
          background: "rgba(8,8,10,0.6)",
        }}
      >
        <TabNav
          tabs={[
            { id: "overview", icon: "📊", label: "Обзор" },
            { id: "security", icon: "🔒", label: "Безопасность", alert: data.failedByIp.some(r => r.fails >= 5) },
            { id: "apps", icon: "📝", label: "Заявки" },
            { id: "people", icon: "👥", label: "Люди" },
            { id: "jury", icon: "⚖️", label: "Жюри" },
            { id: "comms", icon: "📬", label: "Коммуникации" },
            { id: "logs", icon: "📋", label: "Журналы" },
            { id: "system", icon: "⚙️", label: "Система" },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div style={{ padding: "16px 24px 80px" }}>
        {/* ═══════════════════ ТАБ: ОБЗОР ═══════════════════ */}
        {activeTab === "overview" && (<>
        {/* Полоса здоровья системы */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Stat
            label="БД · пинг"
            value={s.dbPingMs < 0 ? "ошибка" : `${s.dbPingMs} мс`}
            color={msColor(s.dbPingMs)}
            sub={data.features.db ? "подключена" : "нет URL"}
          />
          <Stat label="Аптайм процесса" value={fmtUptime(s.uptimeSec)} sub={s.hostname} />
          <Stat
            label="Память (RSS)"
            value={`${s.rssMB} MB`}
            sub={`heap ${s.heapUsedMB}/${s.heapTotalMB} MB`}
          />
          <Stat
            label="ОЗУ сервера"
            value={`${memPct}%`}
            color={memPct > 90 ? C.red : memPct > 75 ? C.amber : C.green}
            sub={`${s.freeMemMB} MB свободно`}
          />
          <Stat
            label="CPU · load"
            value={s.loadavg[0].toFixed(2)}
            sub={`${s.cpus} ядер · ${s.loadavg.map((x) => x.toFixed(1)).join(" / ")}`}
          />
          <Stat label="Платформа" value={s.node} sub={s.platform} />
        </div>

        {/* Доп. системные метрики: диск, git, maintenance */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Stat
            label="Диск"
            value={`${data.disk.pct}%`}
            color={data.disk.pct > 90 ? C.red : data.disk.pct > 75 ? C.amber : C.green}
            sub={`${data.disk.usedGB}/${data.disk.totalGB} GB`}
          />
          {data.git.branch && (
            <Stat
              label="Git"
              value={data.git.commit || "—"}
              sub={`${data.git.branch} · ${data.git.message.slice(0, 30)}`}
            />
          )}
          {data.git.author && (
            <Stat label="Автор коммита" value={data.git.author} sub={data.git.date.slice(0, 19)} />
          )}
        </div>

        {/* DDoS Kill Switch */}
        <div
          style={{
            background: maintenanceActive ? "rgba(255,68,68,0.08)" : C.card,
            border: `2px solid ${maintenanceActive ? "#ff4444" : C.border}`,
            borderRadius: 14,
            padding: "18px 22px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: maintenanceActive ? "rgba(255,68,68,0.15)" : "rgba(47,191,107,0.1)",
              border: `2px solid ${maintenanceActive ? "#ff4444" : "#2fbf6b"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {maintenanceActive ? "🔒" : "🔓"}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ color: C.text, fontSize: 16, fontFamily: F, fontWeight: 700, margin: "0 0 4px" }}>
              Режим обслуживания (DDoS)
            </p>
            <p style={{ color: maintenanceActive ? "#ff6b6b" : C.muted, fontSize: 13, fontFamily: F, margin: 0 }}>
              {maintenanceActive
                ? `Сайт заблокирован · ${data.maintenance.activatedAt?.slice(0, 19) || ""}`
                : "Сайт доступен для всех пользователей"}
            </p>
          </div>
          <button
            onClick={() => doToggleMaintenance(!maintenanceActive)}
            disabled={maintPending}
            style={{
              background: maintenanceActive ? "#2fbf6b" : "#ff4444",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 14,
              fontFamily: F,
              fontWeight: 700,
              cursor: maintPending ? "default" : "pointer",
              opacity: maintPending ? 0.6 : 1,
              letterSpacing: "0.3px",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => { if (!maintPending) e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {maintPending
              ? "Обработка…"
              : maintenanceActive
                ? "Разблокировать сайт"
                : "Заблокировать сайт"}
          </button>
        </div>

        {/* KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Stat label="Всего заявок" value={k.applications} sub={`+${k.applications24h} за 24ч`} color={C.accent === "#0804ff" ? "#7b78ff" : C.accent} />
          <Stat label="Оценок жюри" value={k.evaluations} sub={`${k.recusals} самоотводов`} />
          <Stat label="Вложений" value={k.attachments} sub={fmtBytes(k.attachmentBytes)} />
          <Stat
            label="Входы за 24ч"
            value={`${k.loginOk24}✓ / ${k.loginFail24}✗`}
            color={k.loginFail24 > k.loginOk24 && k.loginFail24 > 3 ? C.red : C.text}
            sub={`${k.loginEvents} всего в журнале`}
          />
          <Stat label="Событий по заявкам" value={k.appEvents} sub="аудит-лог" />
          <Stat label="Сезонов" value={k.seasons} sub={data.activeSeason ? `активен ${data.activeSeason.year}` : "нет активного"} />
        </div>
        </>)}

        {/* ═══════════════════ ТАБ: БЕЗОПАСНОСТЬ ═══════════════════ */}
        {activeTab === "security" && (
          <SecurityCenter data={data} />
        )}

        {/* ═══════════════════ ТАБ: ЗАЯВКИ ═══════════════════ */}
        {/* Основная сетка */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {/* Статус фич */}
          {activeTab === "overview" && (
          <Card title="Интеграции и фичи">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FeatureDot on={data.features.db} label="База данных" />
              <FeatureDot on={data.features.captcha} label="Капча" />
              <FeatureDot on={data.features.telegram} label="Telegram" />
              <FeatureDot on={data.features.mail} label="Почта (SMTP)" />
              <FeatureDot on={data.features.storage} label="Хранилище S3" />
              <FeatureDot on={data.features.dadata} label="DaData (ИНН)" />
            </div>
            {data.activeSeason && (
              <p style={{ color: C.dim, fontSize: 12, fontFamily: F, margin: "12px 0 0" }}>
                Сезон {data.activeSeason.year}: {fmtDate(data.activeSeason.startAt)} —{" "}
                {fmtDate(data.activeSeason.endAt)}
              </p>
            )}
          </Card>
          )}

          {/* Производительность */}
          {activeTab === "overview" && (
          <Card title={`Производительность · окно ${data.perf.windowMinutes} мин`}>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge color={C.green}>p50 {data.perf.p50} мс</Badge>
              <Badge color={msColor(data.perf.p95)}>p95 {data.perf.p95} мс</Badge>
              <Badge color={msColor(data.perf.max)}>max {data.perf.max} мс</Badge>
              <Badge color={C.muted}>{data.perf.count} операций</Badge>
            </div>
            {data.perf.byLabel.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, fontFamily: F, margin: 0 }}>
                Пока нет замеров. Поработайте с сайтом — метрики появятся.
              </p>
            ) : (
              <Scroll max={200}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Операция</th>
                      <th style={{ ...th, textAlign: "right" }}>n</th>
                      <th style={{ ...th, textAlign: "right" }}>avg</th>
                      <th style={{ ...th, textAlign: "right" }}>p95</th>
                      <th style={{ ...th, textAlign: "right" }}>max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perf.byLabel.map((r) => (
                      <tr key={r.label}>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>{r.label}</td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{r.count}</td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{r.avg}</td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: msColor(r.p95) }}>{r.p95}</td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: msColor(r.max) }}>{r.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>
          )}

          {/* Заявки по статусам */}
          {activeTab === "apps" && (
          <Card title="Заявки по статусам">
            {data.byStatus.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Заявок пока нет.</p>
            ) : (
              data.byStatus
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((r) => (
                  <BarRow
                    key={r.status}
                    label={STATUS_LABEL[r.status] ?? r.status}
                    count={r.count}
                    max={statusMax}
                    color={STATUS_COLOR[r.status] ?? C.accent}
                  />
                ))
            )}
          </Card>
          )}

          {/* Пользователи по ролям */}
          {activeTab === "people" && (
          <Card title="Пользователи по ролям">
            {data.usersByRole
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((r) => (
                <BarRow
                  key={r.role}
                  label={ROLE_LABEL[r.role] ?? r.role}
                  count={r.count}
                  max={roleMax}
                  color={r.role === "superadmin" ? C.accent : r.role === "jury" ? "#8a5cf6" : C.muted}
                />
              ))}
          </Card>
          )}

          {/* Заявки по номинациям */}
          {activeTab === "apps" && (
          <Card title="Заявки по номинациям">
            {data.nominations.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Номинаций нет.</p>
            ) : (
              data.nominations
                .slice(0, 14)
                .map((r) => (
                  <BarRow key={r.title} label={r.title.slice(0, 40)} count={r.count} max={nomMax} color="#5b8def" />
                ))
            )}
          </Card>
          )}

          {/* Динамика подачи */}
          {activeTab === "apps" && (
          <Card title="Подача заявок · 14 дней">
            {data.perDay.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Нет данных за период.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                {data.perDay.map((d) => (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ color: C.dim, fontSize: 10, fontFamily: MONO }}>{d.count}</span>
                    <div
                      title={`${d.day}: ${d.count}`}
                      style={{
                        width: "100%",
                        height: `${Math.max(4, (d.count / dayMax) * 90)}px`,
                        background: `linear-gradient(180deg, ${C.accent}, ${C.accent}66)`,
                        borderRadius: "4px 4px 0 0",
                      }}
                    />
                    <span style={{ color: C.dim, fontSize: 9, fontFamily: MONO }}>{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          )}

          {/* Журнал входов */}
          {activeTab === "logs" && (
          <Card title="Журнал входов">
            {data.recentLogins.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Входов пока не было.</p>
            ) : (
              <Scroll>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Время</th>
                      <th style={th}>Email</th>
                      <th style={th}>Роль</th>
                      <th style={th}>Итог</th>
                      <th style={th}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLogins.map((l) => (
                      <tr key={l.id}>
                        <td style={{ ...td, whiteSpace: "nowrap", color: C.muted }} title={fmtTime(l.at)}>
                          {fmtAgo(l.at, now)}
                        </td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>{l.email}</td>
                        <td style={{ ...td, color: C.muted }}>{l.role ? ROLE_LABEL[l.role] ?? l.role : "—"}</td>
                        <td style={td}>
                          {l.success ? (
                            <Badge color={C.green}>успех</Badge>
                          ) : (
                            <Badge color={C.red}>{l.reason ? REASON_LABEL[l.reason] ?? l.reason : "отказ"}</Badge>
                          )}
                        </td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 11.5, color: C.dim }}>{l.ip ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>
          )}

          {/* Последние заявки */}
          {activeTab === "apps" && (
          <Card title="Последние заявки">
            {data.recentApps.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Заявок нет.</p>
            ) : (
              <Scroll>
                {data.recentApps.map((a) => (
                  <div key={a.id} style={{ padding: "8px 6px", borderBottom: `1px solid #17171d` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: C.text, fontSize: 13, fontFamily: F, fontWeight: 600 }}>{a.org}</span>
                      <Badge color={STATUS_COLOR[a.status] ?? C.muted}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                    </div>
                    <p style={{ color: C.dim, fontSize: 11.5, fontFamily: F, margin: "3px 0 0" }}>
                      {a.nomination} · {a.region || "—"} · {fmtAgo(a.at, now)}
                    </p>
                  </div>
                ))}
              </Scroll>
            )}
          </Card>
          )}

          {/* Аудит-лог действий */}
          {activeTab === "logs" && (
          <Card title="Активность (аудит-лог)">
            {data.recentEvents.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>Событий нет.</p>
            ) : (
              <Scroll>
                {data.recentEvents.map((e) => (
                  <div key={e.id} style={{ padding: "8px 6px", borderBottom: `1px solid #17171d` }}>
                    <p style={{ color: C.text, fontSize: 12.5, fontFamily: F, margin: 0 }}>{e.action}</p>
                    <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "3px 0 0" }}>
                      {e.actor} · {fmtAgo(e.at, now)}
                    </p>
                  </div>
                ))}
              </Scroll>
            )}
          </Card>
          )}

          {/* Ошибки */}
          {activeTab === "logs" && (
          <Card
            title="Последние ошибки"
            right={
              data.errors.length > 0 ? (
                <button
                  onClick={doClearErrors}
                  disabled={isPending}
                  style={{
                    background: C.card2,
                    color: C.red,
                    border: `1px solid ${C.red}55`,
                    borderRadius: 7,
                    padding: "5px 10px",
                    fontSize: 11.5,
                    fontFamily: F,
                    fontWeight: 600,
                    cursor: isPending ? "default" : "pointer",
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  Очистить буфер
                </button>
              ) : undefined
            }
          >
            {data.errors.length === 0 ? (
              <p style={{ color: C.green, fontSize: 12.5, margin: 0, fontFamily: F }}>
                ✓ Ошибок в буфере нет.
              </p>
            ) : (
              <Scroll>
                {data.errors.map((e, i) => (
                  <div key={i} style={{ padding: "8px 6px", borderBottom: `1px solid #17171d` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: C.red, fontSize: 12.5, fontFamily: MONO }}>{e.message}</span>
                      <span style={{ color: C.dim, fontSize: 11, fontFamily: F, whiteSpace: "nowrap" }}>
                        {fmtAgo(e.at, now)}
                      </span>
                    </div>
                    {e.context && (
                      <p style={{ color: C.dim, fontSize: 11, fontFamily: MONO, margin: "3px 0 0" }}>{e.context}</p>
                    )}
                  </div>
                ))}
              </Scroll>
            )}
          </Card>
          )}

          {/* Люди и доступ */}
          {activeTab === "people" && (
          <Card title="Пользователи и доступ">
            <Scroll max={360}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>ФИО / Email</th>
                    <th style={th}>Роль</th>
                    <th style={th}>Права</th>
                    <th style={th}>Посл. вход</th>
                    <th style={th}>Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td style={td}>
                        <div style={{ color: C.text, fontSize: 12.5, fontWeight: 600 }}>{u.fio}</div>
                        <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>{u.email}</div>
                      </td>
                      <td style={td}>
                        <Badge color={roleColor(u.role)}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </td>
                      <td style={{ ...td, color: C.muted, fontSize: 11.5 }}>
                        {u.role === "jury"
                          ? u.perms.length
                            ? u.perms.join(", ")
                            : "—"
                          : u.role === "participant"
                            ? "—"
                            : "полный"}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: u.lastLogin ? C.muted : C.dim }}>
                        {u.lastLogin ? fmtAgo(u.lastLogin, now) : "не входил"}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: C.dim, fontSize: 11.5 }}>
                        {fmtDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Scroll>
          </Card>
          )}

          {/* Безопасность: попытки по IP */}
          {activeTab === "security" && (
          <Card title="Безопасность · входы по IP (24ч)">
            {data.failedByIp.length === 0 ? (
              <p style={{ color: C.green, fontSize: 12.5, margin: 0, fontFamily: F }}>
                ✓ Подозрительной активности нет.
              </p>
            ) : (
              <Scroll max={300}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>IP</th>
                      <th style={{ ...th, textAlign: "right" }}>Провалы</th>
                      <th style={{ ...th, textAlign: "right" }}>Всего</th>
                      <th style={th}>Последний</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failedByIp.map((r) => (
                      <tr key={r.ip}>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>{r.ip}</td>
                        <td
                          style={{
                            ...td,
                            textAlign: "right",
                            fontFamily: MONO,
                            fontWeight: 700,
                            color: r.fails >= 5 ? C.red : r.fails > 0 ? C.amber : C.muted,
                          }}
                        >
                          {r.fails}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontFamily: MONO, color: C.muted }}>
                          {r.total}
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap", color: C.dim, fontSize: 11.5 }}>
                          {fmtAgo(r.last, now)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>
          )}

          {/* Конфигурация окружения */}
          {activeTab === "system" && (
          <Card
            title="Конфигурация окружения"
            right={
              <button
                onClick={() => setShowEnvKeys((v) => !v)}
                style={{
                  background: C.card2,
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: "5px 10px",
                  fontSize: 11.5,
                  fontFamily: F,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showEnvKeys ? "Скрыть все ключи" : `Все ключи (${data.env.allKeys.length})`}
              </button>
            }
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 8,
              }}
            >
              {data.env.critical.map((e) => (
                <div
                  key={e.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: C.card2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 9,
                    padding: "8px 10px",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      flexShrink: 0,
                      background: e.set ? C.green : C.dim,
                      boxShadow: e.set ? `0 0 8px ${C.green}88` : "none",
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        color: e.set ? C.text : C.dim,
                        fontSize: 11.5,
                        fontFamily: MONO,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.key}
                    </div>
                    <div style={{ color: C.dim, fontSize: 10.5, fontFamily: MONO }}>
                      {e.secret ? (e.set ? "секрет · задан" : "не задан") : e.preview}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {data.env.deps.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {data.env.deps.map((d) => (
                  <span
                    key={d.name}
                    style={{
                      fontSize: 11,
                      fontFamily: MONO,
                      color: C.muted,
                      background: C.card2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "4px 8px",
                    }}
                  >
                    {d.name}@{d.version}
                  </span>
                ))}
              </div>
            )}

            {showEnvKeys && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  background: "#0a0a0d",
                  border: `1px solid ${C.border}`,
                  borderRadius: 9,
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                <p style={{ color: C.dim, fontSize: 10.5, fontFamily: F, margin: "0 0 8px" }}>
                  Имена всех переменных окружения (значения не показываются):
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {data.env.allKeys.map((k) => (
                    <span key={k} style={{ fontSize: 10.5, fontFamily: MONO, color: C.dim }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
          )}

          {/* Живой лог запросов */}
          {activeTab === "logs" && (
          <Card
            title="Живой лог запросов"
            right={
              <span style={{ color: C.dim, fontSize: 11, fontFamily: F }}>
                ~{data.reqStats.perMinute}/мин · {data.reqStats.total} за {data.reqStats.windowMinutes} мин
              </span>
            }
          >
            {data.reqStats.topPaths.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {data.reqStats.topPaths.map((p) => (
                  <span
                    key={p.path}
                    style={{
                      fontSize: 11,
                      fontFamily: MONO,
                      color: C.muted,
                      background: C.card2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                    }}
                  >
                    {p.path.length > 34 ? p.path.slice(0, 34) + "…" : p.path}
                    <span style={{ color: C.dim }}> · {p.count}</span>
                  </span>
                ))}
              </div>
            )}
            {data.requests.length === 0 ? (
              <p style={{ color: C.dim, fontSize: 12.5, margin: 0, fontFamily: F }}>
                Пока нет запросов в буфере. Походите по сайту — появятся.
              </p>
            ) : (
              <Scroll>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Время</th>
                      <th style={th}>Метод</th>
                      <th style={th}>Путь</th>
                      <th style={th}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requests.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...td, whiteSpace: "nowrap", color: C.muted }} title={fmtTime(r.at)}>
                          {fmtAgo(r.at, now)}
                        </td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                          {r.method}
                        </td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>{r.path}</td>
                        <td style={{ ...td, fontFamily: MONO, fontSize: 11.5, color: C.dim }}>
                          {r.ip ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Scroll>
            )}
          </Card>
          )}

          {/* Действия и экспорт */}
          {activeTab === "system" && (
          <Card title="Действия и экспорт">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <a href="/admin/super/export?type=logins" style={exportBtn}>↓ Журнал входов · CSV</a>
              <a href="/admin/super/export?type=events" style={exportBtn}>↓ Аудит-лог · CSV</a>
              <a href="/admin/super/export?type=apps" style={exportBtn}>↓ Заявки · CSV</a>
              <button onClick={exportJson} style={{ ...exportBtn, cursor: "pointer" }}>
                ↓ Снапшот панели · JSON
              </button>
              <button
                onClick={doClearErrors}
                disabled={isPending}
                style={{ ...exportBtn, color: C.red, borderColor: `${C.red}55`, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.5 : 1 }}
              >
                Очистить буфер ошибок
              </button>
              {msg && (
                <span style={{ color: C.green, fontSize: 12, fontFamily: F, fontWeight: 600 }}>
                  {msg}
                </span>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "0 0 8px", fontWeight: 600 }}>
                СЕЗОНЫ · переключение активности
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {data.seasons.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => doToggleSeason(s.id, !s.isActive)}
                    disabled={isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: C.card2,
                      border: `1px solid ${s.isActive ? C.green + "55" : C.border}`,
                      borderRadius: 9,
                      padding: "8px 12px",
                      fontSize: 12.5,
                      fontFamily: F,
                      fontWeight: 600,
                      color: s.isActive ? C.text : C.muted,
                      cursor: isPending ? "default" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: s.isActive ? C.green : C.dim,
                        boxShadow: s.isActive ? `0 0 8px ${C.green}88` : "none",
                      }}
                    />
                    Сезон {s.year}
                    <span style={{ color: s.isActive ? C.green : C.dim, fontSize: 11 }}>
                      {s.isActive ? "активен" : "выкл"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
          )}

          {/* Счётчики таблиц */}
          {activeTab === "system" && (
          <Card title="Таблицы БД">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {data.tables.map((t) => (
                  <tr key={t.name}>
                    <td style={{ ...td, fontFamily: MONO, fontSize: 12, color: C.muted }}>{t.name}</td>
                    <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>{t.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* НОВЫЕ ФИЧИ — Сетка 3 колонки                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          {/* ── Тест интеграций ─────────────────────────────────────────────── */}
          {activeTab === "comms" && (
          <Card title="Интеграции">
            <IntegrationTestCard />
          </Card>
          )}

          {/* ── Массовая рассылка ──────────────────────────────────────────── */}
          {activeTab === "comms" && (
          <Card title="Рассылка">
            <MassEmailCard />
          </Card>
          )}

          {/* ── Вход от лица ────────────────────────────────────────────────── */}
          {activeTab === "people" && (
          <Card title="Вход от лица">
            <ImpersonationCard users={data.users} />
          </Card>
          )}

          {/* ── Live Logs ───────────────────────────────────────────────────── */}
          {activeTab === "logs" && (
          <Card title="Логи">
            <LiveLogsCard />
          </Card>
          )}

          {/* ── System Monitor (live) ──────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="Мониторинг (live)">
            <SystemMonitorCard />
          </Card>
          )}

          {/* ── Audit Log ──────────────────────────────────────────────────── */}
          {activeTab === "logs" && (
          <Card title="Аудит-лог админов">
            <AuditLogCard logs={data.auditLogs} />
          </Card>
          )}

          {/* ── Quick User Actions ─────────────────────────────────────────── */}
          {activeTab === "people" && (
          <Card title="Быстрые действия по пользователю">
            <UserActionsCard users={data.users} />
          </Card>
          )}

          {/* ── Registration Analytics ──────────────────────────────────────── */}
          {activeTab === "people" && (
          <Card title="Регистрации · 30 дней">
            <RegistrationAnalyticsCard data={data} />
          </Card>
          )}

          {/* ── Database Health ─────────────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="Здоровье БД">
            <DbHealthCard dbHealth={data.dbHealth} />
          </Card>
          )}

          {/* ── Feature Flags ─────────────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="Feature Flags">
            <FeatureFlagsCard />
          </Card>
          )}

          {/* ── Email Queue ───────────────────────────────────────────────── */}
          {activeTab === "comms" && (
          <Card title="Очередь писем">
            <EmailQueueCard />
          </Card>
          )}

          {/* ── DB Backup ─────────────────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="Бэкап БД">
            <DbBackupCard />
          </Card>
          )}

          {/* ── Admin Profiles ───────────────────────────────────────────── */}
          {activeTab === "people" && (
          <Card title="Профили администраторов">
            <AdminProfilesCard profiles={data.adminProfiles} />
          </Card>
          )}

          {/* ── Activity Heatmap ────────────────────────────────────────── */}
          {activeTab === "jury" && (
          <Card title="Активность за год">
            <HeatmapCard data={data.heatmapData} />
          </Card>
          )}

          {/* ── Jury Charts ─────────────────────────────────────────────── */}
          {activeTab === "jury" && (
          <Card title="Нагрузка и оценки жюри">
            <JuryChartsCard data={data.juryChartsData} />
          </Card>
          )}

          {/* ── SSL Monitor ─────────────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="SSL-сертификат">
            <SSLMonitorCard />
          </Card>
          )}

          {/* ── DB Schema Visual ──────────────────────────────────────────── */}
          {activeTab === "system" && (
          <Card title="Структура БД · ERD">
            <DatabaseSchemaViewer tables={data.dbHealth?.tables} />
          </Card>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </main>
  );
}
