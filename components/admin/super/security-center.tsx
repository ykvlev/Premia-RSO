"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SuperData } from "@/components/admin/super-dashboard";
import {
  addIpBan,
  removeIpBan,
  forceLogout,
  unblockUserSession,
  toggleMaintenance,
} from "@/app/admin/super/actions";

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
  cyan: "#00d4ff",
  magenta: "#ff3b8a",
};

const TERM_BG = "#060a07";
const TERM_BORDER = "#16452a";
const TERM_GREEN = "#3dff8a";
const TERM_DIM = "#1e7a46";

type BanItem = SuperData["bans"][number];
type SessionItem = SuperData["sessions"][number];
type FailRow = SuperData["failedByIp"][number];

const REASON_LABEL: Record<string, string> = {
  no_user: "нет пользователя",
  bad_password: "неверный пароль",
  bad_input: "некорректный ввод",
  rate_limited: "лимит попыток",
};

const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/;

// ─── Форматтеры ─────────────────────────────────────────────────────────────
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function fmtAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}с`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}м`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.round(h / 24)}д`;
}
function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}д` : "", h ? `${h}ч` : "", `${m}м`].filter(Boolean).join(" ");
}
function parseBrowser(ua: string | null): string {
  if (!ua) return "UNKNOWN";
  if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/chrome|crios\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua)) return "Safari";
  if (/bot|crawl|spider|curl|wget|python|java\//i.test(ua)) return "BOT/SCRIPT";
  return ua.slice(0, 22);
}
function roleColor(role: string | null): string {
  if (role === "superadmin") return C.magenta;
  if (role === "admin") return C.cyan;
  if (role === "jury") return "#8a5cf6";
  return C.muted;
}
function roleLabel(role: string | null): string {
  if (role === "superadmin") return "SUPERADMIN";
  if (role === "admin") return "ADMIN";
  if (role === "jury") return "JURY";
  if (role === "participant") return "USER";
  return (role ?? "?").toUpperCase();
}
function detailStr(detail: unknown, key: string): string | null {
  if (detail && typeof detail === "object" && key in detail) {
    const v = (detail as Record<string, unknown>)[key];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

// ─── Расчёт уровня угрозы ───────────────────────────────────────────────────
function calcThreat(data: SuperData): number {
  const failW = Math.min(35, data.kpi.loginFail24 * 1.5);
  const totalAuth = data.kpi.loginOk24 + data.kpi.loginFail24;
  const ratioW = totalAuth > 0 ? Math.min(15, (data.kpi.loginFail24 / totalAuth) * 30) : 0;
  const aggrIps = data.failedByIp.filter((r) => r.fails >= 5).length;
  const aggrW = Math.min(25, aggrIps * 8);
  const banW = Math.min(15, data.bans.length * 4);
  const kickedW = Math.min(10, data.sessions.filter((s) => s.blocked).length * 5);
  return Math.min(100, Math.round(failW + ratioW + aggrW + banW + kickedW));
}
function threatLevel(score: number): { label: string; color: string } {
  if (score < 20) return { label: "СПОКОЙНЫЙ", color: C.green };
  if (score < 40) return { label: "НОРМА", color: C.cyan };
  if (score < 60) return { label: "ПОВЫШЕННЫЙ", color: C.amber };
  if (score < 80) return { label: "ВЫСОКИЙ", color: C.magenta };
  return { label: "КРИТИЧЕСКИЙ", color: C.red };
}

// ─── Keyframes (inline-стили не умеют @keyframes) ───────────────────────────
const KEYFRAMES = `
@keyframes sc-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes sc-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.82); } }
@keyframes sc-glow-red {
  0%, 100% { box-shadow: 0 0 22px rgba(255,107,107,0.35), inset 0 0 14px rgba(255,107,107,0.10); }
  50% { box-shadow: 0 0 48px rgba(255,107,107,0.75), inset 0 0 24px rgba(255,107,107,0.24); }
}
@keyframes sc-scan-move { 0% { top: -40%; } 100% { top: 140%; } }
@keyframes sc-flicker { 0%, 95%, 100% { opacity: 1; } 96% { opacity: 0.55; } 97% { opacity: 1; } 98% { opacity: 0.7; } }
`;
const cls = {
  blink: "sc-blink",
  pulse: "sc-pulse",
  glowRed: "sc-glow-red",
  scanbar: "sc-scanbar",
  flicker: "sc-flicker",
};
const keyframeClass = `
.${cls.blink} { animation: sc-blink 1.1s steps(1) infinite; }
.${cls.pulse} { animation: sc-pulse 1.6s ease-in-out infinite; }
.${cls.glowRed} { animation: sc-glow-red 2s ease-in-out infinite; }
.${cls.scanbar} { animation: sc-scan-move 3.4s linear infinite; }
.${cls.flicker} { animation: sc-flicker 6s linear infinite; }
`;

// ─── Мелкие строительные блоки ──────────────────────────────────────────────
function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "16px 18px",
        minWidth: 0,
        position: "relative",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Corners({ color }: { color: string }) {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    pointerEvents: "none",
  };
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...base, top: -1, right: -1, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <span style={{ ...base, bottom: -1, left: -1, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...base, bottom: -1, right: -1, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    </>
  );
}

function SecHead({
  num,
  title,
  right,
}: {
  num: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ color: C.accent === "#0804ff" ? "#7b78ff" : C.accent, fontFamily: MONO, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        [{num}]
      </span>
      <h2
        style={{
          margin: 0,
          color: C.text,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: F,
          textTransform: "uppercase",
          letterSpacing: "1.6px",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)`, minWidth: 20 }} />
      {right}
    </div>
  );
}

function StatCard({
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
        padding: "13px 15px",
        minWidth: 0,
      }}
    >
      <p style={{ color: C.dim, fontSize: 10, fontFamily: MONO, margin: "0 0 7px", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ color: color ?? C.text, fontSize: 24, fontFamily: MONO, fontWeight: 800, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: color + "11",
        border: `1px solid ${color}44`,
        borderRadius: 999,
        padding: "4px 11px",
        fontFamily: MONO,
        fontSize: 11,
        color: C.muted,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <b style={{ color, fontWeight: 800 }}>{value}</b>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 01 · Threat Level Gauge
// ═══════════════════════════════════════════════════════════════════════════
function ThreatGauge({ score, level }: { score: number; level: { label: string; color: string } }) {
  return (
    <div style={{ position: "relative", padding: "8px 4px 4px" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -46,
          pointerEvents: "none",
          background: `radial-gradient(circle at 50% 38%, ${level.color}26, transparent 62%)`,
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span
            className={cls.flicker}
            style={{
              fontFamily: MONO,
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 0.9,
              color: level.color,
              textShadow: `0 0 26px ${level.color}aa`,
            }}
          >
            {score}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: C.dim, marginLeft: 4 }}>/100</span>
        </div>
        <div style={{ paddingBottom: 6 }}>
          <span
            style={{
              display: "inline-block",
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "2.5px",
              color: level.color,
              background: level.color + "14",
              border: `1px solid ${level.color}66`,
              borderRadius: 7,
              padding: "6px 12px",
              textShadow: `0 0 10px ${level.color}88`,
            }}
          >
            {level.label}
          </span>
          <p style={{ color: C.dim, fontSize: 10.5, fontFamily: MONO, margin: "7px 0 0", letterSpacing: "0.6px" }}>
            THREAT LEVEL ASSESSMENT · AUTO-COMPUTED
          </p>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 18,
          height: 14,
          background: "#14141a",
          border: `1px solid ${C.border}`,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(2, score)}%`,
            background: `linear-gradient(90deg, ${level.color}55, ${level.color})`,
            boxShadow: `0 0 18px ${level.color}, 0 0 36px ${level.color}77`,
            transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            borderRadius: 999,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(90deg, transparent 0, transparent calc(10% - 1px), ${C.bg} calc(10% - 1px), ${C.bg} 10%)`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: MONO, fontSize: 9, color: C.dim }}>
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <Pill label="SECTOR" value="PERIMETER" color={C.cyan} />
        <Pill label="MODE" value="MONITOR" color={C.green} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 03 · IP Ban Console (терминал)
// ═══════════════════════════════════════════════════════════════════════════
function IpBanConsole({
  bans,
  setBans,
  ip,
  setIp,
  reason,
  setReason,
}: {
  bans: BanItem[];
  setBans: React.Dispatch<React.SetStateAction<BanItem[]>>;
  ip: string;
  setIp: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [log, setLog] = useState<string[]>(() => [
    "$ sec-console --init",
    "[ok] модуль ipban загружен",
    `[ok] ban-list синхронизирован: ${bans.length} активных`,
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const push = (line: string) => setLog((prev) => [...prev.slice(-40), line]);

  const doBan = () => {
    const ipTrim = ip.trim();
    if (!ipTrim || isPending) return;
    if (!IP_RE.test(ipTrim)) {
      push(`[fail] «${ipTrim}» — ожидается IPv4 или CIDR`);
      return;
    }
    const reasonTrim = reason.trim();
    startTransition(async () => {
      push(`$ ban ${ipTrim}${reasonTrim ? ` --reason="${reasonTrim}"` : ""}`);
      const res = await addIpBan(ipTrim, reasonTrim || "Banned via security center");
      if (res.ok) {
        setBans((prev) =>
          prev.some((b) => b.ip === ipTrim)
            ? prev
            : [
                ...prev,
                {
                  ip: ipTrim,
                  reason: reasonTrim || "Banned via security center",
                  bannedBy: "superadmin",
                  bannedAt: new Date().toISOString(),
                },
              ],
        );
        push(`[ok] ${ipTrim} → DROP · правило активно`);
        setIp("");
        setReason("");
      } else {
        push(`[fail] ${res.error ?? "неизвестная ошибка"}`);
      }
    });
  };

  const doUnban = (bannedIp: string) => {
    if (isPending) return;
    startTransition(async () => {
      push(`$ unban ${bannedIp}`);
      const res = await removeIpBan(bannedIp);
      if (res.ok) {
        setBans((prev) => prev.filter((b) => b.ip !== bannedIp));
        push(`[ok] ${bannedIp} удалён из банлиста`);
      } else {
        push(`[fail] ${res.error ?? "неизвестная ошибка"}`);
      }
    });
  };

  const inputStyle: React.CSSProperties = {
    background: "#071009",
    border: `1px dashed ${TERM_DIM}`,
    borderRadius: 6,
    padding: "9px 12px",
    color: TERM_GREEN,
    caretColor: TERM_GREEN,
    fontFamily: MONO,
    fontSize: 13,
    outline: "none",
    minWidth: 0,
  };

  return (
    <div
      className={cls.flicker}
      style={{
        background: TERM_BG,
        border: `1px solid ${TERM_BORDER}`,
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          background:
            "repeating-linear-gradient(0deg, rgba(61,255,138,0.028) 0px, rgba(61,255,138,0.028) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        aria-hidden
        className={cls.scanbar}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "34%",
          pointerEvents: "none",
          zIndex: 2,
          background: "linear-gradient(180deg, transparent, rgba(61,255,138,0.05), transparent)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 12px",
          borderBottom: `1px solid ${TERM_BORDER}`,
          background: "#081109",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f56" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ffbd2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#27c93f" }} />
        <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 11, color: TERM_DIM }}>
          superadmin@premia:~/security/ipban
        </span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: TERM_DIM }}>
          [{bans.length} RULES]
        </span>
      </div>

      <div style={{ padding: 14, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <input
            placeholder="IP или CIDR (1.2.3.4 или 10.0.0.0/24)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doBan();
            }}
            disabled={isPending}
            style={{ ...inputStyle, flex: "2 1 200px" }}
          />
          <input
            placeholder="причина блокировки..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doBan();
            }}
            disabled={isPending}
            style={{ ...inputStyle, flex: "1 1 140px" }}
          />
          <button
            onClick={doBan}
            disabled={isPending || !ip.trim()}
            style={{
              background: isPending || !ip.trim() ? "#0c1f13" : "#0f2c1a",
              color: isPending || !ip.trim() ? TERM_DIM : TERM_GREEN,
              border: `1px solid ${isPending || !ip.trim() ? TERM_BORDER : TERM_GREEN + "66"}`,
              borderRadius: 6,
              padding: "9px 18px",
              fontFamily: MONO,
              fontSize: 12.5,
              fontWeight: 800,
              letterSpacing: "1.5px",
              cursor: isPending || !ip.trim() ? "default" : "pointer",
              textShadow: isPending || !ip.trim() ? "none" : `0 0 8px ${TERM_GREEN}66`,
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "..." : "ЗАБАНИТЬ"}
          </button>
        </div>

        <div
          ref={logRef}
          style={{
            maxHeight: 110,
            overflowY: "auto",
            fontFamily: MONO,
            fontSize: 11.5,
            lineHeight: 1.65,
            marginBottom: 10,
            borderBottom: `1px dashed ${TERM_BORDER}`,
            paddingBottom: 8,
          }}
        >
          {log.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.startsWith("[fail]")
                  ? C.red
                  : line.startsWith("[ok]")
                    ? TERM_GREEN
                    : line.startsWith("$")
                      ? C.cyan
                      : TERM_DIM,
                wordBreak: "break-all",
              }}
            >
              {line}
            </div>
          ))}
          <div style={{ color: TERM_GREEN }}>
            ${" "}
            <span className={cls.blink} style={{ color: TERM_GREEN }}>
              ▊
            </span>
          </div>
        </div>

        {bans.length === 0 ? (
          <p style={{ color: TERM_DIM, fontFamily: MONO, fontSize: 12, fontStyle: "italic", margin: 0 }}>
            {"// банлист пуст — периметр чист"}
          </p>
        ) : (
          <div style={{ maxHeight: 190, overflowY: "auto" }}>
            {bans.map((b, i) => (
              <div
                key={b.ip}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 2px",
                  borderBottom: i === bans.length - 1 ? "none" : `1px dashed ${TERM_BORDER}`,
                }}
              >
                <span style={{ color: TERM_DIM, fontSize: 10.5, width: 22, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: TERM_GREEN, textShadow: `0 0 6px ${TERM_GREEN}44` }}>
                  {b.ip}
                </span>
                <span style={{ color: TERM_DIM, fontSize: 11, fontFamily: MONO, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {b.reason}
                </span>
                <span style={{ color: TERM_DIM, fontSize: 10, fontFamily: MONO, flexShrink: 0 }}>
                  {b.bannedBy}·{b.bannedAt.slice(5, 10)}
                </span>
                <button
                  onClick={() => doUnban(b.ip)}
                  disabled={isPending}
                  style={{
                    background: "transparent",
                    color: C.red,
                    border: `1px solid ${C.red}55`,
                    borderRadius: 5,
                    padding: "3px 9px",
                    fontFamily: MONO,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    cursor: isPending ? "default" : "pointer",
                    flexShrink: 0,
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  [UNBAN]
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 04 · Failed Login Monitor
// ═══════════════════════════════════════════════════════════════════════════
function FailedLoginMonitor({
  rows,
  bans,
  now,
  onBlock,
}: {
  rows: FailRow[];
  bans: BanItem[];
  now: number;
  onBlock: (ip: string, reason: string) => void;
}) {
  const bannedSet = useMemo(() => new Set(bans.map((b) => b.ip)), [bans]);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.fails - a.fails || b.last - a.last), [rows]);

  const th: React.CSSProperties = {
    color: C.dim,
    fontSize: 10,
    fontFamily: MONO,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    textAlign: "left",
    padding: "6px 8px",
    borderBottom: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    color: C.text,
    fontSize: 12,
    fontFamily: MONO,
    padding: "7px 8px",
    borderBottom: "1px solid #17171d",
    whiteSpace: "nowrap",
  };

  if (sorted.length === 0) {
    return (
      <p style={{ color: C.green, fontSize: 12.5, fontFamily: MONO, margin: 0 }}>
        {"✓ подозрительной активности не зафиксировано"}
      </p>
    );
  }

  return (
    <div style={{ maxHeight: 330, overflowY: "auto", margin: "0 -6px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>IP</th>
            <th style={{ ...th, textAlign: "right" }}>FAILS</th>
            <th style={{ ...th, textAlign: "right" }}>TOTAL</th>
            <th style={th}>LAST</th>
            <th style={{ ...th, textAlign: "right" }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const hot = r.fails >= 5;
            const banned = bannedSet.has(r.ip);
            return (
              <tr key={r.ip}>
                <td style={{ ...td, color: hot ? C.red : C.text }}>{r.ip}</td>
                <td
                  style={{
                    ...td,
                    textAlign: "right",
                    fontWeight: 800,
                    color: hot ? C.red : r.fails > 0 ? C.amber : C.muted,
                    textShadow: hot ? `0 0 8px ${C.red}66` : "none",
                  }}
                >
                  {r.fails}
                </td>
                <td style={{ ...td, textAlign: "right", color: C.muted }}>{r.total}</td>
                <td style={{ ...td, color: C.dim }}>{fmtAgo(r.last, now)}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  {banned ? (
                    <span
                      style={{
                        color: C.green,
                        border: `1px solid ${C.green}55`,
                        background: C.green + "11",
                        borderRadius: 5,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "1px",
                      }}
                    >
                      BANNED
                    </span>
                  ) : hot ? (
                    <button
                      onClick={() => onBlock(r.ip, `${r.fails} неудачных входов за 24ч`)}
                      title="Подставить IP в консоль бана"
                      style={{
                        background: C.red + "14",
                        color: C.red,
                        border: `1px dashed ${C.red}77`,
                        borderRadius: 5,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontFamily: MONO,
                        fontWeight: 800,
                        letterSpacing: "1px",
                        cursor: "pointer",
                        animation: "sc-pulse 1.6s ease-in-out infinite",
                      }}
                    >
                      BLOCK?
                    </button>
                  ) : (
                    <span style={{ color: C.dim, fontSize: 10 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 05 · Active Sessions
// ═══════════════════════════════════════════════════════════════════════════
function ActiveSessions({
  sessions,
  now,
  busyId,
  onKick,
  onUnblock,
}: {
  sessions: SessionItem[];
  now: number;
  busyId: string | null;
  onKick: (s: SessionItem) => void;
  onUnblock: (s: SessionItem) => void;
}) {
  const online = sessions.filter((s) => !s.blocked).length;

  if (sessions.length === 0) {
    return (
      <p style={{ color: C.dim, fontSize: 12.5, fontFamily: MONO, margin: 0 }}>
        {"// активных сессий нет (окно 2 часа)"}
      </p>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Pill label="ONLINE" value={online} color={C.green} />
        <Pill label="KICKED" value={sessions.length - online} color={C.red} />
      </div>
      <div style={{ maxHeight: 330, overflowY: "auto", display: "grid", gap: 8 }}>
        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: s.blocked ? C.red + "08" : C.card2,
              border: `1px solid ${s.blocked ? C.red + "33" : C.border}`,
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                flexShrink: 0,
                background: s.blocked ? C.red : C.green,
                boxShadow: `0 0 8px ${s.blocked ? C.red : C.green}99`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: F,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.email}
                </span>
                <span
                  style={{
                    color: roleColor(s.role),
                    border: `1px solid ${roleColor(s.role)}55`,
                    background: roleColor(s.role) + "11",
                    borderRadius: 5,
                    padding: "1px 6px",
                    fontSize: 9.5,
                    fontFamily: MONO,
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    flexShrink: 0,
                  }}
                >
                  {roleLabel(s.role)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 3, fontFamily: MONO, fontSize: 10.5, color: C.dim, flexWrap: "wrap" }}>
                <span>{s.ip ?? "—"}</span>
                <span>{parseBrowser(s.userAgent)}</span>
                <span>{new Date(s.loginAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{fmtAgo(new Date(s.loginAt).getTime(), now)}</span>
              </div>
            </div>
            {s.blocked ? (
              <button
                onClick={() => onUnblock(s)}
                disabled={!s.userId || busyId === s.id}
                style={{
                  background: C.green + "14",
                  color: C.green,
                  border: `1px solid ${C.green}66`,
                  borderRadius: 7,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontFamily: MONO,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  cursor: !s.userId || busyId === s.id ? "default" : "pointer",
                  opacity: !s.userId || busyId === s.id ? 0.5 : 1,
                  flexShrink: 0,
                }}
              >
                {busyId === s.id ? "..." : "UNBLOCK"}
              </button>
            ) : (
              <button
                onClick={() => onKick(s)}
                disabled={!s.userId || busyId === s.id}
                title={s.userId ? "Разорвать сессию" : "Нет userId — недоступно"}
                style={{
                  background: C.red + "14",
                  color: C.red,
                  border: `1px solid ${C.red}66`,
                  borderRadius: 7,
                  padding: "6px 14px",
                  fontSize: 11,
                  fontFamily: MONO,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  cursor: !s.userId || busyId === s.id ? "default" : "pointer",
                  opacity: !s.userId || busyId === s.id ? 0.5 : 1,
                  textShadow: `0 0 8px ${C.red}55`,
                  flexShrink: 0,
                }}
              >
                {busyId === s.id ? "..." : "KICK"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 06 · Security Alerts Timeline
// ═══════════════════════════════════════════════════════════════════════════
type Alert = {
  id: string;
  at: number;
  color: string;
  tag: string;
  text: string;
  meta: string;
};

function buildAlerts(data: SuperData): Alert[] {
  const out: Alert[] = [];

  for (const l of data.recentLogins) {
    out.push({
      id: `login-${l.id}`,
      at: l.at,
      color: l.success ? C.green : C.red,
      tag: l.success ? "ВХОД" : "ОТКАЗ",
      text: l.email,
      meta: `${l.ip ?? "—"}${!l.success && l.reason ? ` · ${REASON_LABEL[l.reason] ?? l.reason}` : ""}`,
    });
  }

  const secActions = new Set([
    "ban_ip",
    "unban_ip",
    "force_logout",
    "ban_user",
    "unban_user",
    "maintenance_on",
    "maintenance_off",
  ]);

  for (const a of data.auditLogs) {
    if (!secActions.has(a.action)) continue;
    const at = new Date(a.createdAt).getTime();
    const target = a.target ?? detailStr(a.detail, "email") ?? "";
    switch (a.action) {
      case "ban_ip":
      case "ban_user":
        out.push({ id: `audit-${a.id}`, at, color: C.amber, tag: "БАН", text: `${a.actor} → ${target}`, meta: detailStr(a.detail, "reason") ?? a.ip ?? "" });
        break;
      case "unban_ip":
      case "unban_user":
        out.push({ id: `audit-${a.id}`, at, color: C.cyan, tag: "РАЗБАН", text: `${a.actor} → ${target}`, meta: a.ip ?? "" });
        break;
      case "force_logout":
        out.push({ id: `audit-${a.id}`, at, color: C.magenta, tag: "KICK", text: `${a.actor} → ${target}`, meta: detailStr(a.detail, "reason") ?? a.ip ?? "" });
        break;
      case "maintenance_on":
        out.push({ id: `audit-${a.id}`, at, color: C.red, tag: "LOCKDOWN", text: a.actor, meta: detailStr(a.detail, "reason") ?? "" });
        break;
      case "maintenance_off":
        out.push({ id: `audit-${a.id}`, at, color: C.green, tag: "RESTORE", text: a.actor, meta: a.ip ?? "" });
        break;
    }
  }

  return out.sort((x, y) => y.at - x.at).slice(0, 20);
}

function AlertsTimeline({ data, now }: { data: SuperData; now: number }) {
  const alerts = useMemo(() => buildAlerts(data), [data]);

  if (alerts.length === 0) {
    return (
      <p style={{ color: C.dim, fontSize: 12.5, fontFamily: MONO, margin: 0 }}>
        {"// журнал событий безопасности пуст"}
      </p>
    );
  }

  return (
    <div style={{ position: "relative", maxHeight: 372, overflowY: "auto", paddingLeft: 4 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 9,
          top: 8,
          bottom: 8,
          width: 1,
          background: `linear-gradient(180deg, ${C.border}, ${C.border}33)`,
        }}
      />
      <div style={{ display: "grid", gap: 2 }}>
        {alerts.map((a) => (
          <div key={a.id} style={{ position: "relative", padding: "7px 0 7px 26" }}>
            <span
              style={{
                position: "absolute",
                left: 4,
                top: 12,
                width: 11,
                height: 11,
                borderRadius: 999,
                background: a.color,
                boxShadow: `0 0 9px ${a.color}`,
                border: `2px solid ${C.card}`,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.dim, flexShrink: 0 }}>{fmtTime(a.at)}</span>
              <span
                style={{
                  color: a.color,
                  border: `1px solid ${a.color}55`,
                  background: a.color + "11",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontSize: 9.5,
                  fontFamily: MONO,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  flexShrink: 0,
                }}
              >
                {a.tag}
              </span>
              <span style={{ color: C.text, fontSize: 12.5, fontFamily: F, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.text}
              </span>
              <span style={{ marginLeft: "auto", color: C.dim, fontSize: 10.5, fontFamily: MONO, flexShrink: 0 }}>
                {fmtAgo(a.at, now)}
              </span>
            </div>
            {a.meta && (
              <p style={{ color: C.dim, fontSize: 10.5, fontFamily: MONO, margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.meta}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 07 · Emergency Actions
// ═══════════════════════════════════════════════════════════════════════════
function EmergencyActions({
  active,
  busy,
  msg,
  onLockdown,
  onLift,
  onConcept,
}: {
  active: boolean;
  busy: boolean;
  msg: string | null;
  onLockdown: () => void;
  onLift: () => void;
  onConcept: () => void;
}) {
  return (
    <Panel
      style={{
        background: active
          ? "linear-gradient(135deg, #1a0b0d, #120708)"
          : `linear-gradient(135deg, ${C.card}, #120a0c)`,
        borderColor: active ? C.red + "88" : C.border,
      }}
    >
      <Corners color={active ? C.red : C.red + "55"} />
      <SecHead
        num="07"
        title="Emergency Protocols"
        right={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: MONO,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "1.2px",
              color: active ? C.red : C.green,
              border: `1px solid ${active ? C.red + "77" : C.green + "55"}`,
              background: active ? C.red + "14" : C.green + "0d",
              borderRadius: 999,
              padding: "4px 12px",
            }}
          >
            <span
              className={cls.pulse}
              style={{ width: 8, height: 8, borderRadius: 999, background: active ? C.red : C.green, boxShadow: `0 0 8px ${active ? C.red : C.green}` }}
            />
            {active ? "LOCKDOWN ACTIVE" : "SITE OPERATIONAL"}
          </span>
        }
      />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>
        {active ? (
          <button
            onClick={onLift}
            disabled={busy}
            style={{
              flex: "1 1 260px",
              background: "linear-gradient(135deg, #1d5c38, #0f2c1a)",
              color: "#eafff3",
              border: `1px solid ${C.green}`,
              borderRadius: 12,
              padding: "20px 30px",
              fontFamily: MONO,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "3px",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              textShadow: `0 0 12px ${C.green}88`,
              boxShadow: `0 0 26px ${C.green}44, inset 0 0 18px ${C.green}18`,
            }}
          >
            {busy ? "ВЫПОЛНЯЮ..." : "▲ СНЯТЬ LOCKDOWN"}
          </button>
        ) : (
          <button
            onClick={onLockdown}
            disabled={busy}
            className={cls.glowRed}
            style={{
              flex: "1 1 260px",
              background: "linear-gradient(135deg, #ff3b3b, #a30808)",
              color: "#fff",
              border: `1px solid ${C.red}`,
              borderRadius: 12,
              padding: "20px 30px",
              fontFamily: MONO,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "3px",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
              textShadow: "0 1px 6px rgba(0,0,0,0.6)",
            }}
          >
            {busy ? "ВЫПОЛНЯЮ..." : "▼ LOCKDOWN"}
          </button>
        )}

        <button
          onClick={onConcept}
          style={{
            flex: "1 1 240px",
            position: "relative",
            background: "transparent",
            color: C.magenta,
            border: `1px dashed ${C.magenta}88`,
            borderRadius: 12,
            padding: "20px 30px",
            fontFamily: MONO,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "2px",
            cursor: "pointer",
          }}
        >
          BLOCK ALL NON-ADMIN
          <span
            style={{
              position: "absolute",
              top: -9,
              right: 12,
              background: C.bg,
              color: C.magenta,
              border: `1px solid ${C.magenta}66`,
              borderRadius: 4,
              fontSize: 8.5,
              fontFamily: MONO,
              fontWeight: 800,
              letterSpacing: "1px",
              padding: "1px 6px",
            }}
          >
            PROTOTYPE
          </span>
        </button>
      </div>

      <p style={{ color: C.dim, fontSize: 11, fontFamily: MONO, margin: "12px 0 0", lineHeight: 1.6 }}>
        LOCKDOWN активирует режим обслуживания: сайт закрывается для всех, кроме админ-контура.
        Протокол применяется при DDoS-атаке или компрометации периметра.
      </p>
      {msg && (
        <p
          style={{
            color: msg.startsWith("ERR") ? C.red : active ? C.red : C.green,
            fontSize: 12,
            fontFamily: MONO,
            fontWeight: 700,
            margin: "10px 0 0",
            letterSpacing: "0.5px",
          }}
        >
          &gt;&gt; {msg}
        </p>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Center
// ═══════════════════════════════════════════════════════════════════════════
export function SecurityCenter({ data }: { data: SuperData }) {
  const [now, setNow] = useState<number>(data.generatedAt);
  const [bans, setBans] = useState<BanItem[]>(data.bans);
  const [sessions, setSessions] = useState<SessionItem[]>(data.sessions);
  const [banIp, setBanIp] = useState("");
  const [banReason, setBanReason] = useState("");
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [maintActive, setMaintActive] = useState<boolean>(data.maintenance.active);
  const [maintBusy, setMaintBusy] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Сброс локального состояния при обновлении data (router.refresh) — паттерн «adjust state during render»
  const [prevBans, setPrevBans] = useState(data.bans);
  if (prevBans !== data.bans) {
    setPrevBans(data.bans);
    setBans(data.bans);
  }
  const [prevSessions, setPrevSessions] = useState(data.sessions);
  if (prevSessions !== data.sessions) {
    setPrevSessions(data.sessions);
    setSessions(data.sessions);
  }
  const [prevMaint, setPrevMaint] = useState(data.maintenance.active);
  if (prevMaint !== data.maintenance.active) {
    setPrevMaint(data.maintenance.active);
    setMaintActive(data.maintenance.active);
  }

  const score = useMemo(() => calcThreat(data), [data]);
  const level = threatLevel(score);
  const aggrIps = data.failedByIp.filter((r) => r.fails >= 5).length;
  const blockedSessions = sessions.filter((s) => s.blocked).length;

  const doKick = async (s: SessionItem) => {
    if (!s.userId || busySessionId) return;
    setBusySessionId(s.id);
    const res = await forceLogout(s.userId, "KICK из центра безопасности");
    if (res.ok) {
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, blocked: true } : x)));
    }
    setBusySessionId(null);
  };

  const doUnblockSession = async (s: SessionItem) => {
    if (!s.userId || busySessionId) return;
    setBusySessionId(s.id);
    const res = await unblockUserSession(s.userId);
    if (res.ok) {
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, blocked: false } : x)));
    }
    setBusySessionId(null);
  };

  const doLockdown = async () => {
    if (maintBusy) return;
    if (!window.confirm("АКТИВИРОВАТЬ LOCKDOWN?\nСайт будет закрыт для всех пользователей (режим обслуживания).")) return;
    setMaintBusy(true);
    setEmergencyMsg(null);
    const res = await toggleMaintenance(true, "LOCKDOWN: активирован из центра безопасности");
    if (res.ok) {
      setMaintActive(res.active);
      setEmergencyMsg("LOCKDOWN АКТИВИРОВАН — САЙТ ЗАКРЫТ");
    } else {
      setEmergencyMsg(`ERR: ${res.error ?? "не удалось активировать lockdown"}`);
    }
    setMaintBusy(false);
  };

  const doLift = async () => {
    if (maintBusy) return;
    setMaintBusy(true);
    setEmergencyMsg(null);
    const res = await toggleMaintenance(false);
    if (res.ok) {
      setMaintActive(res.active);
      setEmergencyMsg("LOCKDOWN СНЯТ — САЙТ ДОСТУПЕН");
    } else {
      setEmergencyMsg(`ERR: ${res.error ?? "не удалось снять lockdown"}`);
    }
    setMaintBusy(false);
  };

  const onConcept = () => {
    setEmergencyMsg("ПРОТОТИП: массовая блокировка не-админов не подключена к серверу");
    setTimeout(() => setEmergencyMsg(null), 5000);
  };

  const prefillBan = (ip: string, reason: string) => {
    setBanIp(ip);
    setBanReason(reason);
  };

  return (
    <main
      style={{
        background: C.bg,
        backgroundImage: `linear-gradient(${C.border}14 1px, transparent 1px), linear-gradient(90deg, ${C.border}14 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        minHeight: "100vh",
        fontFamily: F,
        padding: "22px 28px 90px",
      }}
    >
      <style>{KEYFRAMES + keyframeClass}</style>

      {/* Шапка командного центра */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 16,
          marginBottom: 20,
        }}
      >
        <span style={{ color: C.accent === "#0804ff" ? "#7b78ff" : C.accent, fontFamily: MONO, fontSize: 18 }}>
          ◤
        </span>
        <div>
          <h1
            style={{
              margin: 0,
              color: C.text,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "2.5px",
              textTransform: "uppercase",
            }}
          >
            Security Command Center
          </h1>
          <p style={{ margin: "3px 0 0", color: C.dim, fontSize: 11, fontFamily: MONO, letterSpacing: "0.6px" }}>
            NODE://PREMIA · SECTOR: PERIMETER DEFENSE · CLEARANCE: SUPERADMIN
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 700,
              color: C.green,
              border: `1px solid ${C.green}55`,
              background: C.green + "0d",
              borderRadius: 999,
              padding: "5px 12px",
            }}
          >
            <span
              className={cls.pulse}
              style={{ width: 8, height: 8, borderRadius: 999, background: C.green, boxShadow: `0 0 8px ${C.green}` }}
            />
            SYS:ONLINE
          </span>
          {maintActive && (
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "1px",
                color: C.red,
                border: `1px solid ${C.red}77`,
                background: C.red + "14",
                borderRadius: 999,
                padding: "5px 12px",
              }}
            >
              MAINTENANCE:ON
            </span>
          )}
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, fontWeight: 700 }}>
            {fmtClock(now)}
            <span className={cls.blink} style={{ color: C.green }}>
              _
            </span>
          </span>
        </div>
      </header>

      {/* 01–02 · Уровень угрозы + статистика */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Panel>
          <Corners color={level.color + "88"} />
          <SecHead num="01" title="Threat Level" right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>AUTO-EVAL</span>} />
          <ThreatGauge score={score} level={level} />
        </Panel>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, alignContent: "start", minWidth: 0 }}>
          <SecHeadWrap />
          <StatCard
            label="Blocked IPs"
            value={bans.length}
            sub="записей в банлисте"
            color={bans.length > 0 ? C.red : C.green}
          />
          <StatCard
            label="Failed Logins 24h"
            value={data.kpi.loginFail24}
            sub={`${data.kpi.loginOk24} успешных`}
            color={data.kpi.loginFail24 > data.kpi.loginOk24 && data.kpi.loginFail24 > 3 ? C.red : C.amber}
          />
          <StatCard
            label="Active Sessions"
            value={sessions.length - blockedSessions}
            sub={`${blockedSessions} заблокировано`}
            color={C.cyan}
          />
          <StatCard label="Threat Score" value={`${score}/100`} sub={level.label} color={level.color} />
          <StatCard label="Uptime" value={fmtUptime(data.system.uptimeSec)} sub={data.system.hostname} color={C.green} />
        </section>
      </div>

      {/* 03–04 · Консоль бана + монитор провалов */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Panel>
          <SecHead
            num="03"
            title="IP Ban Console"
            right={<span style={{ fontFamily: MONO, fontSize: 10, color: TERM_DIM }}>ROOT ACCESS</span>}
          />
          <IpBanConsole
            bans={bans}
            setBans={setBans}
            ip={banIp}
            setIp={setBanIp}
            reason={banReason}
            setReason={setBanReason}
          />
        </Panel>

        <Panel>
          <SecHead
            num="04"
            title="Failed Login Monitor"
            right={
              <span style={{ fontFamily: MONO, fontSize: 10, color: aggrIps > 0 ? C.red : C.dim }}>
                AGGRESSIVE: {aggrIps}
              </span>
            }
          />
          <FailedLoginMonitor rows={data.failedByIp} bans={bans} now={now} onBlock={prefillBan} />
        </Panel>
      </div>

      {/* 05–06 · Сессии + таймлайн */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Panel>
          <SecHead
            num="05"
            title="Active Sessions"
            right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>WINDOW 2H</span>}
          />
          <ActiveSessions
            sessions={sessions}
            now={now}
            busyId={busySessionId}
            onKick={doKick}
            onUnblock={doUnblockSession}
          />
        </Panel>

        <Panel>
          <SecHead
            num="06"
            title="Security Alerts"
            right={<span style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>LAST 20 EVENTS</span>}
          />
          <AlertsTimeline data={data} now={now} />
        </Panel>
      </div>

      {/* 07 · Экстренные протоколы */}
      <EmergencyActions
        active={maintActive}
        busy={maintBusy}
        msg={emergencyMsg}
        onLockdown={doLockdown}
        onLift={doLift}
        onConcept={onConcept}
      />
    </main>
  );
}

// Заголовок над рядом стат-карточек (секция 02 внутри правой колонки)
function SecHeadWrap() {
  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: C.accent === "#0804ff" ? "#7b78ff" : C.accent, fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>
        [02]
      </span>
      <h2
        style={{
          margin: 0,
          color: C.text,
          fontSize: 13,
          fontWeight: 800,
          fontFamily: F,
          textTransform: "uppercase",
          letterSpacing: "1.6px",
        }}
      >
        Perimeter Stats
      </h2>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)`, minWidth: 20 }} />
    </div>
  );
}
