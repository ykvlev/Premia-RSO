"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Flag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
}

export function FeatureFlagsCard() {
  const router = useRouter();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  useEffect(() => {
    fetch("/api/admin/super/feature-flags")
      .then((r) => r.json())
      .then((d) => { setFlags(d.flags ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleFlag(id: string, current: boolean) {
    const res = await fetch("/api/admin/super/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !current }),
    });
    if (res.ok) {
      setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !current } : f));
      flash("Флаг обновлён");
    } else {
      flash("Ошибка", false);
    }
  }

  async function deleteFlag(id: string) {
    if (!confirm("Удалить флаг?")) return;
    const res = await fetch("/api/admin/super/feature-flags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setFlags((prev) => prev.filter((f) => f.id !== id));
      flash("Удалён");
    }
  }

  async function addFlag() {
    if (!newKey.trim() || !newLabel.trim()) return flash("Заполните ключ и название", false);
    const res = await fetch("/api/admin/super/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim(), description: newDesc.trim() || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setFlags((prev) => [...prev, data.flag]);
      setNewKey(""); setNewLabel(""); setNewDesc(""); setShowAdd(false);
      flash("Флаг создан");
    } else {
      flash("Ошибка", false);
    }
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: 24
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ color: "#f2f0ec", fontSize: 18, fontWeight: 700, margin: 0 }}>
            Feature Flags
          </h3>
          <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0" }}>Управление фичами без деплоя</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: "rgba(8,4,255,0.15)", border: "1px solid rgba(8,4,255,0.3)",
          color: "#7B7BFF", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13
        }}>
          {showAdd ? "Отмена" : "+ Добавить"}
        </button>
      </div>

      {msg && <p style={{ color: msg.ok ? "#2fbf6b" : "#ff6b6b", fontSize: 12, margin: "0 0 12px" }}>{msg.text}</p>}

      {showAdd && (
        <div style={{ marginBottom: 16, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Ключ (registration_open)"
            style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f0ec", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
          <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Название"
            style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f0ec", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Описание (необязательно)"
            style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f2f0ec", fontSize: 13, marginBottom: 8, boxSizing: "border-box" }} />
          <button onClick={addFlag} style={{ background: "#0804ff", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>Создать</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#555", fontSize: 13 }}>Загрузка...</div>
      ) : flags.length === 0 ? (
        <div style={{ color: "#555", fontSize: 13 }}>Нет флагов. Создайте первый.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {flags.map((f) => (
            <div key={f.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", background: f.enabled ? "rgba(8,4,255,0.06)" : "rgba(255,255,255,0.02)",
              borderRadius: 10, border: `1px solid ${f.enabled ? "rgba(8,4,255,0.2)" : "rgba(255,255,255,0.04)"}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#f2f0ec", fontWeight: 600, fontSize: 14 }}>{f.label}</span>
                  <code style={{ color: "#666", fontSize: 12, background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{f.key}</code>
                </div>
                {f.description && <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>{f.description}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => toggleFlag(f.id, f.enabled)} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                  background: f.enabled ? "#0804ff" : "rgba(255,255,255,0.1)", transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3,
                    left: f.enabled ? 23 : 3, transition: "left 0.2s",
                  }} />
                </button>
                <button onClick={() => deleteFlag(f.id)} style={{
                  background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16, padding: 4,
                }} title="Удалить">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
