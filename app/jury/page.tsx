import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { LogoutLink } from "@/components/logout-link";
import {
  JuryBoard,
  type JuryItem,
  type Criterion,
  type JuryPerms,
} from "@/components/jury/jury-board";

export const metadata: Metadata = { title: "Кабинет жюри" };
export const dynamic = "force-dynamic";

const F = "var(--font-onest), sans-serif";

/** Критерии номинации из Json (защитно). Пусто → одна «Общая оценка» 0–100. */
function parseCriteria(raw: unknown): Criterion[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: Criterion[] = [];
  for (const c of arr) {
    if (c && typeof c === "object") {
      const o = c as Record<string, unknown>;
      const key = typeof o.key === "string" ? o.key : "";
      const label = typeof o.label === "string" ? o.label : key;
      const max = typeof o.maxScore === "number" ? o.maxScore : 100;
      if (key) out.push({ key, label, max });
    }
  }
  if (out.length === 0) out.push({ key: "overall", label: "Общая оценка", max: 100 });
  return out;
}

/** Кабинет жюри: заявки закреплённых номинаций + выставление баллов. */
export default async function JuryPage() {
  const session = await requireRole("jury", "admin", "superadmin");
  const juryUserId = session.user.id;
  const isAdmin = session.user.role === "admin" || session.user.role === "superadmin";

  // Права: у админа — все; у жюри — из профиля (по умолчанию score+comment).
  const me = await db.user.findUnique({
    where: { id: juryUserId },
    select: { permissions: true },
  });
  const pr = (me?.permissions ?? {}) as Record<string, unknown>;
  const perms: JuryPerms = isAdmin
    ? {
        score: true,
        comment: true,
        changeStatus: true,
        viewContacts: true,
        blindScoring: false,
      }
    : {
        score: pr.score !== false,
        comment: pr.comment !== false,
        changeStatus: pr.changeStatus === true,
        viewContacts: pr.viewContacts === true,
        blindScoring: pr.blindScoring === true,
      };

  const assignments = await db.juryAssignment.findMany({
    where: { juryUserId },
    select: { nominationId: true },
  });
  const assignedIds = assignments.map((a) => a.nominationId);

  // Админ видит все заявки; жюри — только по закреплённым номинациям (нет закреплений → ничего).
  const where = isAdmin
    ? {}
    : { nominationId: { in: assignedIds.length ? assignedIds : ["__none__"] } };

  const [rows, recusals] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        nomination: { select: { title: true, criteria: true } },
        evaluations: {
          where: { juryUserId },
          select: { scores: true, comment: true },
        },
      },
    }),
    db.juryRecusal.findMany({ where: { juryUserId }, select: { applicationId: true } }),
  ]);
  const recusedSet = new Set(recusals.map((r) => r.applicationId));

  const items: JuryItem[] = rows.map((a) => {
    const p = (a.payload ?? {}) as Record<string, unknown>;
    // Слепая оценка: имя/регион/контакты не отправляем клиенту вообще.
    const nominee = perms.blindScoring
      ? `Заявка № ${a.id.slice(-6)}`
      : (typeof p.nomineeFio === "string" && p.nomineeFio) || a.contactFio || a.orgName;
    const myEval = a.evaluations[0];
    const myScores =
      myEval && myEval.scores && typeof myEval.scores === "object"
        ? (myEval.scores as Record<string, number>)
        : {};
    return {
      id: a.id,
      nominationTitle: a.nomination.title,
      nominee,
      region: perms.blindScoring ? "" : a.region,
      submitted: a.createdAt.toLocaleDateString("ru-RU"),
      status: a.status,
      criteria: parseCriteria(a.nomination.criteria),
      myScores,
      myComment: myEval?.comment ?? "",
      email: perms.viewContacts && !perms.blindScoring ? a.email : undefined,
      phone: perms.viewContacts && !perms.blindScoring ? a.phone : undefined,
      recused: recusedSet.has(a.id),
    };
  });

  // прогресс считаем без заявок, по которым взят самоотвод
  const active = items.filter((it) => !it.recused);
  const evaluated = active.filter((it) => Object.keys(it.myScores).length > 0).length;
  const toEvaluate = active.length;

  return (
    <main
      style={{ flex: 1, minHeight: "100vh", background: "#08080a", fontFamily: F }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #2a2a32",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo/logo-white.svg"
          alt="Российские студенческие отряды"
          style={{ height: 30, width: "auto" }}
        />
        <LogoutLink />
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p
          style={{
            color: "#6a6a72",
            fontSize: 12,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            marginBottom: 8,
          }}
        >
          Кабинет жюри
        </p>
        <h1 style={{ color: "#f2f0ec", fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>
          {session.user.name || "Эксперт"}
        </h1>
        <p style={{ color: "#9a9aa4", fontSize: 14, margin: "0 0 8px" }}>
          Оцените заявки по закреплённым номинациям. Оценка сохраняется сразу и
          доступна оргкомитету.
        </p>
        <p style={{ color: "#6a6a72", fontSize: 13, margin: "0 0 12px" }}>
          Заявок к оценке: <b style={{ color: "#c8c8d0" }}>{toEvaluate}</b> · оценено
          вами: <b style={{ color: "#c8c8d0" }}>{evaluated}</b>
          {isAdmin && <> · режим админа: видны все заявки</>}
        </p>

        {toEvaluate > 0 && (
          <div style={{ margin: "0 0 32px", maxWidth: 480 }}>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "#1a1a22",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round((evaluated / toEvaluate) * 100)}%`,
                  background: evaluated === toEvaluate ? "#2fbf6b" : "#0804ff",
                  borderRadius: 999,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <p style={{ color: "#6a6a72", fontSize: 12, margin: "6px 0 0" }}>
              {evaluated === toEvaluate
                ? "Все заявки оценены — спасибо!"
                : `Прогресс: ${Math.round((evaluated / toEvaluate) * 100)}% · осталось ${toEvaluate - evaluated}`}
            </p>
          </div>
        )}

        <JuryBoard items={items} perms={perms} />
      </div>
    </main>
  );
}
