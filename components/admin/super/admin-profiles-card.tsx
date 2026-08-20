"use client";

import { useState } from "react";

const C = {
  bg: "#08080a",
  card: "#0d0d11",
  card2: "#111117",
  border: "#1d1d25",
  border2: "#2a2a32",
  accent: "#0804ff",
  green: "#2fbf6b",
  muted: "#6a6a72",
  text: "#f2f0ec",
  dim: "#9a9aa4",
  red: "#ff6b6b",
};
const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const ROLE_OPT = [
  { value: "admin", label: "Оргкомитет", color: "#5b8def" },
  { value: "superadmin", label: "Суперадмин", color: "#2b4cff" },
];

export function AdminProfilesCard({ profiles }: {
  profiles: { id: string; fio: string; email: string; phone: string | null; role: string; createdAt: string }[];
}) {
  const [list, setList] = useState(profiles);
  const [form, setForm] = useState({ fio: "", email: "", password: "", phone: "", role: "admin" });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fio: "", email: "", phone: "", role: "admin" });

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { createAdminProfile } = await import("@/app/admin/super/actions");
    const r = await createAdminProfile(form.fio, form.email, form.password, form.role as any, form.phone);
    setBusy(false);
    if (r.ok) {
      flash(true, "Профиль создан");
      setList([{ id: r.id!, fio: form.fio, email: form.email, phone: form.phone || null, role: form.role, createdAt: new Date().toISOString() }, ...list]);
      setForm({ fio: "", email: "", password: "", phone: "", role: "admin" });
      setShowForm(false);
    } else {
      flash(false, r.error ?? "Ошибка");
    }
  }

  async function doDelete(id: string) {
    if (!confirm("Удалить профиль?")) return;
    setBusy(true);
    const { deleteAdminProfile } = await import("@/app/admin/super/actions");
    const r = await deleteAdminProfile(id);
    setBusy(false);
    if (r.ok) {
      flash(true, "Удалён");
      setList(list.filter((p) => p.id !== id));
    } else {
      flash(false, r.error ?? "Ошибка");
    }
  }

  async function doReset(id: string) {
    setBusy(true);
    const { resetAdminPassword } = await import("@/app/admin/super/actions");
    const r = await resetAdminPassword(id);
    setBusy(false);
    if (r.ok) {
      setResetId(id);
      setResetCode(r.code!);
      flash(true, "Пароль сброшен");
    } else {
      flash(false, r.error ?? "Ошибка");
    }
  }

  async function doEdit(id: string) {
    setBusy(true);
    const { updateAdminProfile } = await import("@/app/admin/super/actions");
    const r = await updateAdminProfile(id, { fio: editForm.fio, email: editForm.email, phone: editForm.phone, role: editForm.role as any });
    setBusy(false);
    if (r.ok) {
      flash(true, "Обновлено");
      setList(list.map((p) => p.id === id ? { ...p, fio: editForm.fio, email: editForm.email, phone: editForm.phone || null, role: editForm.role } : p));
      setEditId(null);
    } else {
      flash(false, r.error ?? "Ошибка");
    }
  }

  const roleMeta = (role: string) => ROLE_OPT.find((r) => r.value === role) ?? ROLE_OPT[0];

  return (
    <div style={{ fontFamily: F }}>
      {msg && (
        <div style={{ padding: "8px 12px", borderRadius: 7, background: msg.ok ? C.green + "18" : C.red + "18", color: msg.ok ? C.green : C.red, fontSize: 12.5, marginBottom: 10, border: `1px solid ${msg.ok ? C.green : C.red}33` }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: C.dim, fontSize: 12 }}>{list.length} администраторов</span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "6px 14px", borderRadius: 7, background: showForm ? C.card2 : C.accent, color: showForm ? C.dim : "#fff", border: `1px solid ${showForm ? C.border : C.accent}`, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F }}
        >
          {showForm ? "Отмена" : "+ Создать"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={doCreate} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 9, background: C.card2, border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <input placeholder="ФИО" value={form.fio} onChange={(e) => setForm({ ...form, fio: e.target.value })} required style={{ padding: "7px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontFamily: F }} />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ padding: "7px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontFamily: F }} />
          <input placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} style={{ padding: "7px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontFamily: F }} />
          <input placeholder="Телефон (необязательно)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ padding: "7px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontFamily: F }} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ padding: "7px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5, fontFamily: F }}>
            <option value="admin">Оргкомитет</option>
            <option value="superadmin">Суперадмин</option>
          </select>
          <button type="submit" disabled={busy} style={{ padding: "8px 16px", borderRadius: 7, background: C.accent, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.5 : 1, fontFamily: F }}>
            {busy ? "Создаю..." : "Создать профиль"}
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {list.map((p) => {
          const rm = roleMeta(p.role);
          const isEditing = editId === p.id;
          const showReset = resetId === p.id && resetCode;

          return (
            <div key={p.id} style={{ padding: "10px 12px", borderRadius: 8, background: C.card2, border: `1px solid ${C.border}` }}>
              {isEditing ? (
                <form onSubmit={(e) => { e.preventDefault(); doEdit(p.id); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input value={editForm.fio} onChange={(e) => setEditForm({ ...editForm, fio: e.target.value })} style={{ padding: "6px 8px", borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: F }} />
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={{ padding: "6px 8px", borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: F }} />
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Телефон" style={{ padding: "6px 8px", borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: F }} />
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={{ padding: "6px 8px", borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: F }}>
                    <option value="admin">Оргкомитет</option>
                    <option value="superadmin">Суперадмин</option>
                  </select>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="submit" disabled={busy} style={{ padding: "5px 12px", borderRadius: 5, background: C.green, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F }}>Сохранить</button>
                    <button type="button" onClick={() => setEditId(null)} style={{ padding: "5px 12px", borderRadius: 5, background: "transparent", color: C.dim, border: `1px solid ${C.border}`, fontSize: 11, cursor: "pointer", fontFamily: F }}>Отмена</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: rm.color + "20", border: `1px solid ${rm.color}44`, display: "flex", alignItems: "center", justifyContent: "center", color: rm.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                    {p.fio.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: C.text, fontSize: 12.5, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.fio}</p>
                    <p style={{ color: C.dim, fontSize: 11, margin: "2px 0 0", fontFamily: MONO }}>{p.email}</p>
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.5px", color: rm.color, textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: rm.color + "15", border: `1px solid ${rm.color}33` }}>{rm.label}</span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { setEditId(p.id); setEditForm({ fio: p.fio, email: p.email, phone: p.phone ?? "", role: p.role }); }} title="Редактировать" style={{ width: 26, height: 26, borderRadius: 5, background: "transparent", border: `1px solid ${C.border}`, color: C.accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✎</button>
                    <button onClick={() => doReset(p.id)} title="Сбросить пароль" style={{ width: 26, height: 26, borderRadius: 5, background: "transparent", border: `1px solid ${C.border}`, color: "#f5a623", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🔑</button>
                    <button onClick={() => doDelete(p.id)} title="Удалить" style={{ width: 26, height: 26, borderRadius: 5, background: "transparent", border: `1px solid ${C.border}`, color: C.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
                  </div>
                </div>
              )}

              {showReset && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "#f5a62310", border: `1px solid #f5a62333` }}>
                  <p style={{ color: C.dim, fontSize: 10.5, margin: 0 }}>Новый пароль:</p>
                  <p style={{ color: "#f5a623", fontSize: 13, fontWeight: 700, fontFamily: MONO, margin: "4px 0 0", wordBreak: "break-all" }}>{resetCode}</p>
                  <button onClick={() => { navigator.clipboard.writeText(resetCode!); flash(true, "Скопировано"); }} style={{ marginTop: 4, padding: "3px 8px", borderRadius: 4, background: "#f5a62320", border: `1px solid #f5a62344`, color: "#f5a623", fontSize: 10, cursor: "pointer", fontFamily: F }}>Копировать</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
