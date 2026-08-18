"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const ROLE: Record<string, { label: string; color: string }> = {
  superadmin: { label: "Суперадмин", color: "#2b4cff" },
  admin: { label: "Оргкомитет", color: "#5b8def" },
  expert: { label: "Эксперт", color: "#8a5cf6" },
};

type Ico = (p: { s?: number }) => React.ReactElement;
const svg = (d: string): Ico =>
  function Icon({ s = 16 }) {
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flex: "0 0 auto" }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: d }}
      />
    );
  };

const IcList = svg('<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>');
const IcCompare = svg('<path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5"/>');
const IcDash = svg('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/><rect x="3" y="14" width="8" height="7" rx="1"/>');
const IcJury = svg('<circle cx="12" cy="8" r="3.2"/><path d="M5 20a7 7 0 0114 0"/>');
const IcRank = svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>');
const IcDoc = svg('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6"/>');
const IcMail = svg('<path d="M3 8l9 6 9-6M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"/>');
const IcExport = svg('<path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>');
const IcOut = svg('<path d="M16 17l5-5-5-5M21 12H9M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7"/>');

export function AdminSidebar({
  displayName,
  role,
  appsCount,
  newCount,
}: {
  displayName: string;
  role: string;
  appsCount: number;
  newCount: number;
}) {
  const pathname = usePathname();
  const view = useSearchParams().get("view") ?? "";
  const rmeta = ROLE[role] ?? ROLE.admin;

  const onAdminRoot = pathname === "/admin";
  const active = {
    list: onAdminRoot && !view,
    compare: onAdminRoot && view === "compare",
    dashboard: onAdminRoot && view === "dashboard",
    jury: pathname.startsWith("/admin/jury"),
    ranking: pathname.startsWith("/admin/ranking"),
    protocol: pathname.startsWith("/admin/protocol"),
    mailing: pathname.startsWith("/admin/mailing"),
  };

  const label = (t: string) => (
    <p
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "1px",
        color: "#5c5c66",
        textTransform: "uppercase",
        padding: "14px 8px 6px",
        margin: 0,
      }}
    >
      {t}
    </p>
  );
  const st = (on: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "9px 10px",
    borderRadius: 9,
    background: on ? "#2b4cff1f" : "transparent",
    color: on ? "#c9d1ff" : "#9a9aa4",
    fontWeight: 500,
    fontSize: 13.5,
    fontFamily: F,
    textDecoration: "none",
  });
  const badge = (n: number, on: boolean) => (
    <span
      style={{
        marginLeft: "auto",
        fontSize: 11,
        fontFamily: MONO,
        background: on ? "#2b4cff" : "#ffffff12",
        color: on ? "#fff" : "#9a9aa4",
        padding: "1px 7px",
        borderRadius: 20,
        minWidth: 20,
        textAlign: "center",
      }}
    >
      {n}
    </span>
  );

  return (
    <aside
      style={{
        background: "#0d0d11",
        borderRight: "1px solid #1d1d25",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px",
        gap: 2,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 14px" }}>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.5px", color: "#f2f0ec" }}>ТРУД</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#2b4cff", fontStyle: "italic" }}>КРУТ</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.8px",
            color: rmeta.color,
            border: `1px solid ${rmeta.color}44`,
            borderRadius: 5,
            padding: "3px 6px",
            textTransform: "uppercase",
          }}
        >
          {rmeta.label}
        </span>
      </div>

      {label("Работа")}
      <Link href="/admin" style={st(active.list)}><IcList /> Заявки {badge(appsCount, active.list)}</Link>
      <Link href="/admin?view=compare" style={st(active.compare)}><IcCompare /> Сравнение</Link>
      <Link href="/admin?view=dashboard" style={st(active.dashboard)}><IcDash /> Дашборд</Link>

      {label("Оценка")}
      <Link href="/admin/jury" style={st(active.jury)}><IcJury /> Жюри</Link>
      <Link href="/admin/ranking" style={st(active.ranking)}><IcRank /> Рейтинг</Link>
      <Link href="/admin/protocol" style={st(active.protocol)}><IcDoc /> Протокол</Link>
      <Link href="/admin/mailing" style={st(active.mailing)}><IcMail /> Рассылка</Link>

      <div style={{ flex: 1 }} />

      {label("Экспорт")}
      <a href="/admin/export" style={st(false)}><IcExport /> Таблица Excel</a>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          padding: 9,
          borderRadius: 10,
          border: "1px solid #1d1d25",
          background: "#111117",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: rmeta.color + "22",
            border: `1px solid ${rmeta.color}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: rmeta.color,
            fontWeight: 800,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {displayName.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1.25,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </p>
          <p
            style={{
              color: rmeta.color,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {rmeta.label}
          </p>
        </div>
        <button
          onClick={() => void signOut({ callbackUrl: "/login" })}
          title="Выйти"
          style={{
            marginLeft: "auto",
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            color: "#5c5c66",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <IcOut s={15} />
        </button>
      </div>
      {newCount > 0 && (
        <p style={{ color: "#5b8def", fontSize: 11, fontFamily: F, margin: "10px 4px 0" }}>
          {newCount} новых заявок ждут разбора
        </p>
      )}
    </aside>
  );
}
