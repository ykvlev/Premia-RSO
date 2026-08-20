"use client";

import { useState, useEffect, useCallback } from "react";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = {
  bg: "#08080a", card: "#0e0e12", card2: "#121216", border: "#22222a",
  text: "#f2f0ec", muted: "#9a9aa4", dim: "#6a6a72",
  accent: "#0804ff", green: "#2fbf6b", red: "#ff6b6b", amber: "#f5a623",
};

const SL: Record<string, string> = {
  new: "Отправлена", queued: "В очереди", review: "На рассмотрении", revision: "Доработка",
  scoring: "На оценке", finalist: "Финалист", winner: "Победитель", rejected: "Отклонена",
};
const SC: Record<string, string> = {
  new: "#5b8def", queued: "#9a9aa4", review: "#f5a623", revision: "#e0703a",
  scoring: "#8a5cf6", finalist: "#2fbf6b", winner: "#f5c518", rejected: "#ff6b6b",
};

type AppRow = {
  id: string; orgName: string; contactFio: string; email: string; region: string;
  status: string; createdAt: string; nominationId: string; nominationTitle: string;
  evalCount: number; avgScore: number | null;
  lastEvents: { actor: string; action: string; at: string }[];
};
type Jury = { id: string; fio: string; email: string; assigned: number; evaluated: number; recused: number; pending: number; avgScore: number | null };
type Template = { id: string; name: string; subject: string; body: string; category: string };

function ago(ts: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return s + "с";
  const m = Math.round(s / 60); if (m < 60) return m + "м";
  const h = Math.round(m / 60); if (h < 24) return h + "ч";
  return Math.round(h / 24) + "д";
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ display: "inline-block", background: color + "22", color, border: "1px solid " + color + "55", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontFamily: F, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

const ipt: React.CSSProperties = { background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 14px", color: C.text, fontFamily: F, fontSize: 13 };
const btn = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontFamily: F, fontWeight: 600, cursor: "pointer" });

export function ManagementPanel({
  initialApps, total, page: initPage, totalPages: initTotal, nominations, regions, juryWorkload, templates: initTemplates,
}: {
  initialApps: AppRow[]; total: number; page: number; totalPages: number;
  nominations: { id: string; title: string }[]; regions: string[];
  juryWorkload: Jury[]; templates: Template[];
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  const [apps, setApps] = useState(initialApps);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stF, setStF] = useState("all");
  const [nomF, setNomF] = useState("all");
  const [regF, setRegF] = useState("all");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"apps" | "jury" | "tpl">("apps");

  const [tlId, setTlId] = useState<string | null>(null);
  const [tlData, setTlData] = useState<any>(null);
  const [cmt, setCmt] = useState("");
  const [bulkSt, setBulkSt] = useState("");
  const [bulkJury, setBulkJury] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState(initTemplates);
  const [newTpl, setNewTpl] = useState({ name: "", subject: "", body: "", category: "general" });

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 4000); };

  const doSearch = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ search, status: stF, nominationId: nomF, region: regF, page: "1", limit: "50" });
    try { const r = await fetch("/api/admin/management?" + p); const d = await r.json(); setApps(d.apps ?? []); } catch {}
    setLoading(false);
  }, [search, stF, nomF, regF]);

  useEffect(() => { doSearch(); }, [stF, nomF, regF]);

  const toggleSel = (id: string) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(p => p.size === apps.length ? new Set() : new Set(apps.map(a => a.id)));

  const doBulkSt = async () => {
    if (!bulkSt || sel.size === 0) return;
    const { bulkUpdateStatus } = await import("@/app/admin/actions");
    const r = await bulkUpdateStatus(Array.from(sel), bulkSt);
    flash(r.ok ? "Обновлено " + sel.size + " заявок" : "Ошибка");
    setSel(new Set()); setBulkSt(""); doSearch();
  };

  const loadTl = async (id: string) => {
    setTlId(id); setTlData(null);
    const { getApplicationTimeline } = await import("@/app/admin/management/actions");
    setTlData(await getApplicationTimeline(id));
  };

  const doCmt = async () => {
    if (!tlId || !cmt.trim()) return;
    const { addInternalComment } = await import("@/app/admin/management/actions");
    await addInternalComment(tlId, cmt.trim()); setCmt(""); loadTl(tlId);
  };

  const doExport = async () => {
    const { exportApplicationsToExcel } = await import("@/app/admin/management/actions");
    const r = await exportApplicationsToExcel({ status: stF, nominationId: nomF, region: regF });
    if (r.csv) {
      const blob = new Blob(["\uFEFF" + r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "apps-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const doCreateTpl = async () => {
    if (!newTpl.name.trim() || !newTpl.subject.trim() || !newTpl.body.trim()) return;
    const { createNotificationTemplate } = await import("@/app/admin/management/actions");
    await createNotificationTemplate(newTpl.name.trim(), newTpl.subject.trim(), newTpl.body.trim(), newTpl.category);
    setNewTpl({ name: "", subject: "", body: "", category: "general" });
    const { getNotificationTemplates } = await import("@/app/admin/management/actions");
    setTemplates(await getNotificationTemplates());
  };

  const doDelTpl = async (id: string) => {
    const { deleteNotificationTemplate } = await import("@/app/admin/management/actions");
    await deleteNotificationTemplate(id);
    setTemplates(t => t.filter(x => x.id !== id));
  };

  return (
    <div style={{ padding: "0 28px 80px" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {([["apps", "Заявки"], ["jury", "Жюри и нагрузка"], ["tpl", "Шаблоны уведомлений"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} style={{
            ...btn(tab === k ? C.accent : C.card, tab === k ? "#fff" : C.muted),
            border: "1px solid " + (tab === k ? C.accent : C.border),
          }}>{l}</button>
        ))}
      </div>
      {msg && <p style={{ color: C.green, fontSize: 13, fontFamily: F, margin: "0 0 12px" }}>{msg}</p>}

      {/* ═══ APPLICATIONS ═══ */}
      {tab === "apps" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Поиск по ФИО, email, организации, региону, ИНН..." style={{ ...ipt, flex: 1, minWidth: 250 }} />
            <select value={stF} onChange={e => setStF(e.target.value)} style={{ ...ipt, minWidth: 160 }}>
              <option value="all">Все статусы</option>
              {Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={nomF} onChange={e => setNomF(e.target.value)} style={{ ...ipt, minWidth: 200 }}>
              <option value="all">Все номинации</option>
              {nominations.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <select value={regF} onChange={e => setRegF(e.target.value)} style={{ ...ipt, minWidth: 160 }}>
              <option value="all">Все регионы</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={doExport} style={{ ...btn(C.card2, C.muted), border: "1px solid " + C.border }}>Экспорт CSV</button>
          </div>

          {sel.size > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: "10px 14px", background: C.card, border: "1px solid " + C.accent + "44", borderRadius: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: C.text, fontSize: 13, fontFamily: F, fontWeight: 600 }}>Выбрано: {sel.size}</span>
              <select value={bulkSt} onChange={e => setBulkSt(e.target.value)} style={{ ...ipt, padding: "6px 10px", fontSize: 12 }}>
                <option value="">Сменить статус...</option>
                {Object.entries(SL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {bulkSt && <button onClick={doBulkSt} style={{ ...btn(C.accent, "#fff"), padding: "6px 12px", fontSize: 12 }}>Применить</button>}
              <select value={bulkJury} onChange={e => setBulkJury(e.target.value)} style={{ ...ipt, padding: "6px 10px", fontSize: 12 }}>
                <option value="">Назначить жюри...</option>
                {juryWorkload.map(j => <option key={j.id} value={j.id}>{j.fio || j.email}</option>)}
              </select>
            </div>
          )}

          {loading ? <p style={{ color: C.dim, fontSize: 13 }}>Загрузка...</p> : (
            <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 12px", textAlign: "left", color: C.dim, fontSize: 11, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid " + C.border }}>
                      <input type="checkbox" checked={sel.size === apps.length && apps.length > 0} onChange={toggleAll}
                        style={{ accentColor: C.accent, cursor: "pointer" }} />
                    </th>
                    {["Организация / ФИО", "Номинация", "Регион", "Статус", "Оценки", "Дата", "Действия"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.dim, fontSize: 11, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid " + C.border }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid " + C.border, background: sel.has(a.id) ? C.accent + "08" : "transparent" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggleSel(a.id)} style={{ accentColor: C.accent, cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ color: C.text, fontSize: 13, fontFamily: F, fontWeight: 600 }}>{a.orgName || a.contactFio}</div>
                        <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>{a.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12, fontFamily: F }}>{a.nominationTitle}</td>
                      <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12, fontFamily: F }}>{a.region || "—"}</td>
                      <td style={{ padding: "10px 12px" }}><Badge color={SC[a.status] ?? C.muted}>{SL[a.status] ?? a.status}</Badge></td>
                      <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12, fontFamily: F }}>
                        {a.evalCount > 0 ? <span>{a.avgScore} <span style={{ color: C.dim }}>({a.evalCount})</span></span> : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: C.dim, fontSize: 12, fontFamily: F }}>{ago(a.createdAt, now)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => loadTl(a.id)} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, fontFamily: F, fontWeight: 600, cursor: "pointer" }}>Таймлайн</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tlId && tlData && (
            <div style={{ marginTop: 16, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ color: C.text, fontSize: 16, fontFamily: F, fontWeight: 700, margin: 0 }}>Таймлайн заявки</h3>
                <button onClick={() => { setTlId(null); setTlData(null); }} style={{ background: "none", border: "none", color: C.dim, fontSize: 18, cursor: "pointer" }}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <h4 style={{ color: C.muted, fontSize: 12, fontFamily: F, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>События</h4>
                  {tlData.events?.length === 0 && <p style={{ color: C.dim, fontSize: 12 }}>Нет событий</p>}
                  {tlData.events?.map((e: any) => (
                    <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                      <p style={{ color: C.text, fontSize: 12, fontFamily: F, margin: 0 }}>{e.action}</p>
                      <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "2px 0 0" }}>{e.actor} · {ago(e.at, now)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 style={{ color: C.muted, fontSize: 12, fontFamily: F, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>Оценки жюри</h4>
                  {tlData.evaluations?.length === 0 && <p style={{ color: C.dim, fontSize: 12 }}>Нет оценок</p>}
                  {tlData.evaluations?.map((e: any, i: number) => {
                    const scores = (e.scores ?? {}) as Record<string, number>;
                    const total = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
                    return (
                      <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: C.text, fontSize: 12, fontFamily: MONO }}>{e.juryId.slice(0, 8)}...</span>
                          <Badge color={C.green}>{total}</Badge>
                        </div>
                        {e.comment && <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "4px 0 0" }}>{e.comment}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: C.card2, borderRadius: 10 }}>
                <h4 style={{ color: C.muted, fontSize: 12, fontFamily: F, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>Внутренний комментарий</h4>
                <textarea value={cmt} onChange={e => setCmt(e.target.value)} rows={3} placeholder="Заметка для оргкомитета (заявителю не видно)..."
                  style={{ width: "100%", background: C.card, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontFamily: F, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
                <button onClick={doCmt} disabled={!cmt.trim()} style={{ ...btn(cmt.trim() ? C.accent : C.card2, cmt.trim() ? "#fff" : C.dim), marginTop: 8, border: "1px solid " + C.border }}>
                  Сохранить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ JURY TAB ═══ */}
      {tab === "jury" && (
        <div>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Жюри", "Назначено", "Оценено", "Ожидает", "Самоотводы", "Ср. балл"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontSize: 11, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid " + C.border }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {juryWorkload.map(j => {
                  const pct = j.assigned > 0 ? Math.round((j.evaluated / j.assigned) * 100) : 0;
                  return (
                    <tr key={j.id} style={{ borderBottom: "1px solid " + C.border }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ color: C.text, fontSize: 13, fontFamily: F, fontWeight: 600 }}>{j.fio || "—"}</div>
                        <div style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>{j.email}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: C.text, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{j.assigned}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: C.green, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{j.evaluated}</span>
                          <div style={{ flex: 1, maxWidth: 100, height: 6, background: "#1a1a20", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct + "%", background: C.green, borderRadius: 999, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ color: C.dim, fontSize: 11, fontFamily: MONO }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: j.pending > 0 ? C.amber : C.dim, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{j.pending}</td>
                      <td style={{ padding: "10px 14px", color: j.recused > 0 ? C.red : C.dim, fontSize: 14, fontFamily: MONO }}>{j.recused}</td>
                      <td style={{ padding: "10px 14px", color: j.avgScore !== null ? C.text : C.dim, fontSize: 14, fontFamily: MONO, fontWeight: 700 }}>{j.avgScore ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontFamily: F, fontWeight: 700, margin: "0 0 12px" }}>Назначение жюри на номинацию</h3>
            <JuryAssignForm juryWorkload={juryWorkload} nominations={nominations} />
          </div>
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {tab === "tpl" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontFamily: F, fontWeight: 700, margin: "0 0 12px" }}>Создать шаблон</h3>
            <input value={newTpl.name} onChange={e => setNewTpl({ ...newTpl, name: e.target.value })} placeholder="Название шаблона" style={{ ...ipt, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
            <input value={newTpl.subject} onChange={e => setNewTpl({ ...newTpl, subject: e.target.value })} placeholder="Тема письма" style={{ ...ipt, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
            <select value={newTpl.category} onChange={e => setNewTpl({ ...newTpl, category: e.target.value })} style={{ ...ipt, width: "100%", boxSizing: "border-box", marginBottom: 8 }}>
              <option value="general">Общее</option>
              <option value="status">Статус</option>
              <option value="reminder">Напоминание</option>
              <option value="system">Система</option>
            </select>
            <textarea value={newTpl.body} onChange={e => setNewTpl({ ...newTpl, body: e.target.value })} rows={5} placeholder="Текст шаблона..."
              style={{ width: "100%", background: C.card2, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.text, fontFamily: F, fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }} />
            <button onClick={doCreateTpl} style={{ ...btn(C.accent, "#fff") }}>Создать</button>
          </div>
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontFamily: F, fontWeight: 700, margin: "0 0 12px" }}>Шаблоны ({templates.length})</h3>
            {templates.length === 0 ? <p style={{ color: C.dim, fontSize: 12 }}>Нет шаблонов</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ padding: "10px 14px", background: C.card2, borderRadius: 10, border: "1px solid " + C.border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ color: C.text, fontSize: 13, fontFamily: F, fontWeight: 600 }}>{t.name}</span>
                        <Badge color={C.accent}>{t.category}</Badge>
                      </div>
                      <button onClick={() => doDelTpl(t.id)} style={{ background: "none", border: "none", color: C.red, fontSize: 14, cursor: "pointer" }}>✕</button>
                    </div>
                    <p style={{ color: C.dim, fontSize: 12, fontFamily: F, margin: "4px 0 0" }}>Тема: {t.subject}</p>
                    <p style={{ color: C.dim, fontSize: 11, fontFamily: F, margin: "2px 0 0", maxHeight: 40, overflow: "hidden" }}>{t.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JuryAssignForm({ juryWorkload, nominations }: { juryWorkload: Jury[]; nominations: { id: string; title: string }[] }) {
  const [juryId, setJuryId] = useState("");
  const [nomId, setNomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const doAssign = async () => {
    if (!juryId || !nomId) return;
    setBusy(true);
    const { assignJuryToNomination } = await import("@/app/admin/management/actions");
    const r = await assignJuryToNomination(juryId, nomId);
    setBusy(false);
    setResult(r.ok ? "Назначено " + r.assigned + " заявок" : "Ошибка");
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select value={juryId} onChange={e => setJuryId(e.target.value)} style={{ ...ipt, minWidth: 200 }}>
        <option value="">Выберите жюри...</option>
        {juryWorkload.map(j => <option key={j.id} value={j.id}>{j.fio || j.email} (нагрузка: {j.assigned})</option>)}
      </select>
      <select value={nomId} onChange={e => setNomId(e.target.value)} style={{ ...ipt, minWidth: 250 }}>
        <option value="">Выберите номинацию...</option>
        {nominations.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
      </select>
      <button onClick={doAssign} disabled={busy || !juryId || !nomId} style={{ ...btn(busy || !juryId || !nomId ? C.card2 : C.accent, busy || !juryId || !nomId ? C.dim : "#fff") }}>
        {busy ? "Назначаю..." : "Назначить"}
      </button>
      {result && <span style={{ color: C.green, fontSize: 12, fontFamily: F }}>{result}</span>}
    </div>
  );
}
