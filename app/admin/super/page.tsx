import type { Metadata } from "next";
import os from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  measure,
  getPerfStats,
  getRecentErrors,
  getRecentRequests,
  getRequestStats,
} from "@/lib/observability";
import { getMaintenanceInfo } from "@/lib/maintenance";
import { SuperDashboard } from "@/components/admin/super-dashboard";

export const metadata: Metadata = { title: "Супер-админ · Панель системы" };
export const dynamic = "force-dynamic";

function appVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    return pkg.version ?? "—";
  } catch {
    return "—";
  }
}

/**
 * Сквозная панель супер-админа: метрики, логи входов, активность заявок,
 * производительность/лаги, системные параметры, статус фич, ошибки.
 * Доступ строго superadmin (не admin).
 */
export default async function SuperPage() {
  await requireRole("superadmin");

  const dayAgo = new Date(Date.now() - 24 * 3600_000);

  // Пинг БД — реальная задержка round-trip.
  let dbPingMs = -1;
  try {
    const t = performance.now();
    await measure("db.ping", () => db.$queryRaw`SELECT 1`);
    dbPingMs = Math.round(performance.now() - t);
  } catch {
    dbPingMs = -1;
  }

  let data: any;
  try {
    const [
      appTotal,
      byStatus,
      usersByRole,
      evalCount,
      attachAgg,
      recusalCount,
      loginTotal,
      eventTotal,
      seasonCount,
      nomCountRows,
      recentLogins,
      recentEvents,
      recentApps,
      loginOk24,
      loginFail24,
      apps24,
      perDayRaw,
      activeSeason,
      tableCounts,
      allUsers,
      lastLoginRows,
      failedIpRows,
      seasonsList,
    ] = await Promise.all([
      db.application.count(),
      db.application.groupBy({ by: ["status"], _count: { _all: true } }),
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
      db.evaluation.count(),
      db.attachment.aggregate({ _count: { _all: true }, _sum: { size: true } }),
      db.juryRecusal.count(),
      db.loginEvent.count(),
      db.applicationEvent.count(),
      db.season.count(),
      db.nomination.findMany({
        select: { title: true, _count: { select: { applications: true } } },
      }),
      db.loginEvent.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
      db.applicationEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
      db.application.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          orgName: true,
          contactFio: true,
          region: true,
          status: true,
          createdAt: true,
          nomination: { select: { title: true } },
        },
      }),
      db.loginEvent.count({ where: { success: true, createdAt: { gte: dayAgo } } }),
      db.loginEvent.count({ where: { success: false, createdAt: { gte: dayAgo } } }),
      db.application.count({ where: { createdAt: { gte: dayAgo } } }),
      db.$queryRaw<{ d: Date; n: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS d, COUNT(*) AS n
        FROM "Application"
        WHERE "createdAt" >= NOW() - INTERVAL '14 days'
        GROUP BY d ORDER BY d ASC`,
      db.season.findFirst({
        where: { isActive: true },
        select: { year: true, startAt: true, endAt: true },
      }),
      // Счётчики строк по всем таблицам
      Promise.all([
        db.user.count(),
        db.season.count(),
        db.nomination.count(),
        db.application.count(),
        db.evaluation.count(),
        db.attachment.count(),
        db.juryAssignment.count(),
        db.juryRecusal.count(),
        db.applicationEvent.count(),
        db.loginEvent.count(),
      ]),
      // Все пользователи + сводка прав (блок «Люди и доступ»)
      db.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, fio: true, email: true, role: true, createdAt: true, permissions: true },
        take: 200,
      }),
      // Последний успешный вход по каждому email
      db.$queryRaw<{ email: string; last: Date }[]>`
        SELECT email, MAX("createdAt") AS last
        FROM "LoginEvent" WHERE success = true GROUP BY email`,
      // Провалы входа по IP за 24ч (безопасность)
      db.$queryRaw<{ ip: string; fails: bigint; total: bigint; last: Date }[]>`
        SELECT ip,
               COUNT(*) FILTER (WHERE success = false) AS fails,
               COUNT(*) AS total,
               MAX("createdAt") AS last
        FROM "LoginEvent"
        WHERE "createdAt" >= NOW() - INTERVAL '24 hours' AND ip IS NOT NULL
        GROUP BY ip
        ORDER BY fails DESC, total DESC
        LIMIT 15`,
      // Сезоны для переключателя активности (блок «Действия»)
      db.season.findMany({
        orderBy: { year: "desc" },
        select: { id: true, year: true, isActive: true },
      }),
    ]);

    const mem = process.memoryUsage();
    const toMB = (b: number) => +(b / 1048576).toFixed(1);

    const perf = getPerfStats(30);
    const errors = getRecentErrors(25);
    const requests = getRecentRequests(60);
    const reqStats = getRequestStats(15);

    // ── Люди и доступ ──────────────────────────────────────────────────────────
    const lastLoginMap = new Map(lastLoginRows.map((r) => [r.email, new Date(r.last).getTime()]));
    const PERM_KEYS: { key: string; short: string }[] = [
      { key: "score", short: "оценка" },
      { key: "comment", short: "коммент." },
      { key: "changeStatus", short: "статус" },
      { key: "viewContacts", short: "контакты" },
    ];
    const users = allUsers.map((u) => {
      const p = (u.permissions ?? null) as Record<string, boolean> | null;
      const perms = p ? PERM_KEYS.filter((k) => p[k.key]).map((k) => k.short) : [];
      return {
        id: u.id,
        fio: u.fio,
        email: u.email,
        role: u.role as string,
        createdAt: u.createdAt.getTime(),
        lastLogin: lastLoginMap.get(u.email) ?? null,
        perms,
      };
    });
    const failedByIp = failedIpRows.map((r) => ({
      ip: r.ip,
      fails: Number(r.fails),
      total: Number(r.total),
      last: new Date(r.last).getTime(),
    }));

    // ── Конфигурация окружения ─────────────────────────────────────────────────
    const CRITICAL_ENV: { key: string; secret: boolean }[] = [
      { key: "DATABASE_URL", secret: true },
      { key: "AUTH_SECRET", secret: true },
      { key: "NEXTAUTH_SECRET", secret: true },
      { key: "NEXT_PUBLIC_BASE_URL", secret: false },
      { key: "NEXT_PUBLIC_SMARTCAPTCHA_CLIENT_KEY", secret: false },
      { key: "SMARTCAPTCHA_SERVER_KEY", secret: true },
      { key: "TELEGRAM_BOT_TOKEN", secret: true },
      { key: "TELEGRAM_CHAT_ID", secret: false },
      { key: "SMTP_HOST", secret: false },
      { key: "SMTP_USER", secret: false },
      { key: "SMTP_PASS", secret: true },
      { key: "S3_ENDPOINT", secret: false },
      { key: "S3_BUCKET", secret: false },
      { key: "S3_ACCESS_KEY_ID", secret: true },
      { key: "S3_SECRET_ACCESS_KEY", secret: true },
      { key: "DADATA_TOKEN", secret: true },
    ];
    const envCritical = CRITICAL_ENV.map((e) => {
      const raw = process.env[e.key];
      const set = !!raw && raw.length > 0;
      const isProd = process.env.NODE_ENV === "production";
      const preview =
        set && !e.secret && !isProd && raw ? raw.slice(0, 40) : set ? "•".repeat(8) : "—";
      return { key: e.key, set, secret: e.secret, preview };
    });
    const envKeys = process.env.NODE_ENV === "production"
      ? CRITICAL_ENV.map((e) => e.key)
      : Object.keys(process.env).sort();

    let deps: { name: string; version: string }[] = [];
    try {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
      const d = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      deps = ["next", "react", "react-dom", "next-auth", "@prisma/client", "prisma", "zod", "tailwindcss"]
        .filter((n) => d[n])
        .map((n) => ({ name: n, version: String(d[n]).replace(/^[\^~]/, "") }));
    } catch {
      deps = [];
    }

    const perDay = perDayRaw.map((r) => ({
      day: new Date(r.d).toISOString().slice(0, 10),
      count: Number(r.n),
    }));

    const [uCount, sCount, nCount, aCount, eCount, atCount, jaCount, jrCount, aeCount, leCount] =
      tableCounts;

    data = {
      generatedAt: Date.now(),
      kpi: {
        applications: appTotal,
        applications24h: apps24,
        evaluations: evalCount,
        recusals: recusalCount,
        loginEvents: loginTotal,
        appEvents: eventTotal,
        seasons: seasonCount,
        attachments: attachAgg._count._all,
        attachmentBytes: attachAgg._sum.size ?? 0,
        loginOk24,
        loginFail24,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count._all })),
      nominations: nomCountRows
        .map((n) => ({ title: n.title, count: n._count.applications }))
        .sort((a, b) => b.count - a.count),
      perDay,
      recentLogins: recentLogins.map((l) => ({
        id: l.id,
        email: l.email,
        role: l.role,
        success: l.success,
        reason: l.reason,
        ip: l.ip,
        userAgent: l.userAgent,
        at: l.createdAt.getTime(),
      })),
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        actor: e.actor,
        action: e.action,
        at: e.createdAt.getTime(),
      })),
      recentApps: recentApps.map((a) => ({
        id: a.id,
        org: a.orgName || a.contactFio,
        region: a.region,
        nomination: a.nomination.title,
        status: a.status,
        at: a.createdAt.getTime(),
      })),
      system: {
        version: appVersion(),
        node: process.version,
        platform: `${process.platform} · ${process.arch}`,
        nodeEnv: process.env.NODE_ENV ?? "—",
        uptimeSec: Math.round(process.uptime()),
        hostname: process.env.NODE_ENV === "production" ? "•••" : os.hostname(),
        cpus: os.cpus().length,
        loadavg: os.loadavg().map((n) => +n.toFixed(2)),
        rssMB: toMB(mem.rss),
        heapUsedMB: toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        totalMemMB: toMB(os.totalmem()),
        freeMemMB: toMB(os.freemem()),
        dbPingMs,
      },
      features: {
        db: !!process.env.DATABASE_URL,
        captcha:
          !!process.env.NEXT_PUBLIC_SMARTCAPTCHA_CLIENT_KEY &&
          !!process.env.SMARTCAPTCHA_SERVER_KEY,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
        mail: !!process.env.SMTP_HOST,
        storage: !!process.env.S3_ENDPOINT && !!process.env.S3_BUCKET,
        dadata: !!process.env.DADATA_TOKEN,
      },
      activeSeason: activeSeason
        ? {
            year: activeSeason.year,
            startAt: activeSeason.startAt.getTime(),
            endAt: activeSeason.endAt.getTime(),
          }
        : null,
      perf,
      errors,
      users,
      failedByIp,
      requests: requests.map((r) => ({
        method: r.method,
        path: r.path,
        ip: r.ip ?? null,
        ua: r.ua ?? null,
        at: r.at,
      })),
      reqStats,
      env: {
        critical: envCritical,
        allKeys: envKeys,
        deps,
      },
      seasons: seasonsList.map((s) => ({ id: s.id, year: s.year, isActive: s.isActive })),
      tables: [
        { name: "User", count: uCount },
        { name: "Season", count: sCount },
        { name: "Nomination", count: nCount },
        { name: "Application", count: aCount },
        { name: "Evaluation", count: eCount },
        { name: "Attachment", count: atCount },
        { name: "JuryAssignment", count: jaCount },
        { name: "JuryRecusal", count: jrCount },
        { name: "ApplicationEvent", count: aeCount },
        { name: "LoginEvent", count: leCount },
      ],
    };

    // ── Disk, Git, Maintenance ───────────────────────────────────────────────
    let disk = { totalGB: 0, usedGB: 0, freeGB: 0, pct: 0 };
    try {
      const df = execSync("df -BG / | tail -1", { encoding: "utf8", timeout: 3000 });
      const parts = df.trim().split(/\s+/);
      if (parts.length >= 4) {
        disk = {
          totalGB: parseInt(parts[1]) || 0,
          usedGB: parseInt(parts[2]) || 0,
          freeGB: parseInt(parts[3]) || 0,
          pct: parseInt(parts[4]) || 0,
        };
      }
    } catch {}

    let git = { branch: "", commit: "", message: "", author: "", date: "" };
    try {
      git.branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8", timeout: 3000 }).trim();
      git.commit = execSync("git rev-parse --short HEAD", { encoding: "utf8", timeout: 3000 }).trim();
      git.message = execSync("git log -1 --pretty=%s", { encoding: "utf8", timeout: 3000 }).trim();
      git.author = execSync("git log -1 --pretty=%an", { encoding: "utf8", timeout: 3000 }).trim();
      git.date = execSync("git log -1 --pretty=%ci", { encoding: "utf8", timeout: 3000 }).trim();
    } catch {}

    const maintenance = getMaintenanceInfo();

    data.disk = disk;
    data.git = git;
    data.maintenance = maintenance;
  } catch {
    // БД недоступна — пустой дашборд
    const perf = getPerfStats(30);
    const errors = getRecentErrors(25);
    const requests = getRecentRequests(60);
    const reqStats = getRequestStats(15);
    const mem = process.memoryUsage();
    const toMB = (b: number) => +(b / 1048576).toFixed(1);
    let deps: { name: string; version: string }[] = [];
    try {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
      const d = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      deps = ["next", "react", "react-dom", "next-auth", "@prisma/client", "prisma", "zod", "tailwindcss"]
        .filter((n) => d[n])
        .map((n) => ({ name: n, version: String(d[n]).replace(/^[\^~]/, "") }));
    } catch { deps = []; }
    const CRITICAL_ENV: { key: string; secret: boolean }[] = [
      { key: "DATABASE_URL", secret: true }, { key: "AUTH_SECRET", secret: true },
      { key: "NEXTAUTH_SECRET", secret: true }, { key: "NEXT_PUBLIC_BASE_URL", secret: false },
      { key: "NEXT_PUBLIC_SMARTCAPTCHA_CLIENT_KEY", secret: false }, { key: "SMARTCAPTCHA_SERVER_KEY", secret: true },
      { key: "TELEGRAM_BOT_TOKEN", secret: true }, { key: "TELEGRAM_CHAT_ID", secret: false },
      { key: "SMTP_HOST", secret: false }, { key: "SMTP_USER", secret: false },
      { key: "SMTP_PASS", secret: true }, { key: "S3_ENDPOINT", secret: false },
      { key: "S3_BUCKET", secret: false }, { key: "S3_ACCESS_KEY_ID", secret: true },
      { key: "S3_SECRET_ACCESS_KEY", secret: true }, { key: "DADATA_TOKEN", secret: true },
    ];
    data = {
      generatedAt: Date.now(),
      kpi: { applications: 0, applications24h: 0, evaluations: 0, recusals: 0, loginEvents: 0, appEvents: 0, seasons: 0, attachments: 0, attachmentBytes: 0, loginOk24: 0, loginFail24: 0 },
      byStatus: [], usersByRole: [], nominations: [], perDay: [],
      recentLogins: [], recentEvents: [], recentApps: [],
      system: {
        version: appVersion(), node: process.version, platform: `${process.platform} · ${process.arch}`,
        nodeEnv: process.env.NODE_ENV ?? "—", uptimeSec: Math.round(process.uptime()),
        hostname: os.hostname(), cpus: os.cpus().length,
        loadavg: os.loadavg().map((n) => +n.toFixed(2)),
        rssMB: toMB(mem.rss), heapUsedMB: toMB(mem.heapUsed), heapTotalMB: toMB(mem.heapTotal),
        totalMemMB: toMB(os.totalmem()), freeMemMB: toMB(os.freemem()), dbPingMs,
      },
      features: { db: false, captcha: false, telegram: false, mail: false, storage: false, dadata: false },
      activeSeason: null, perf, errors, users: [], failedByIp: [], requests: [], reqStats,
      env: { critical: CRITICAL_ENV.map((e) => ({ key: e.key, set: false, secret: e.secret, preview: "—" })), allKeys: Object.keys(process.env).sort(), deps },
      seasons: [], tables: [],
      disk: { totalGB: 0, usedGB: 0, freeGB: 0, pct: 0 },
      git: { branch: "", commit: "", message: "", author: "", date: "" },
      maintenance: getMaintenanceInfo(),
    };
  }

  return <SuperDashboard data={data} />;
}
