"use client";

import { useState } from "react";
import { beginTwoFactorSetup, confirmTwoFactor, disableTwoFactor } from "@/app/profile/actions";

const F = "var(--font-onest), sans-serif";
const input = { width: "100%", background: "#0f0f14", border: "1px solid #2a2a32", borderRadius: 10, padding: "11px 13px", color: "#f2f0ec", fontSize: 14, fontFamily: F, boxSizing: "border-box" as const };

export function TwoFactorForm({ enabled }: { enabled: boolean }) {
  const [active, setActive] = useState(enabled);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true); setMessage("");
    const result = await beginTwoFactorSetup();
    setBusy(false);
    if (result.ok && result.qr) { setQr(result.qr); setSecret(result.secret ?? ""); }
    else if (!result.ok) setMessage(result.error ?? "Ошибка");
  }
  async function confirm() {
    setBusy(true); setMessage("");
    const result = await confirmTwoFactor(code);
    setBusy(false);
    if (result.ok) { setActive(true); setQr(null); setCode(""); setMessage("2FA включена"); }
    else setMessage(result.error ?? "Ошибка");
  }
  async function disable() {
    setBusy(true); setMessage("");
    const result = await disableTwoFactor(code);
    setBusy(false);
    if (result.ok) { setActive(false); setCode(""); setMessage("2FA отключена"); }
    else setMessage(result.error ?? "Ошибка");
  }

  return (
    <section style={{ borderTop: "1px solid #2a2a32", paddingTop: 20, marginTop: 4 }}>
      <p style={{ color: "#f2f0ec", fontSize: 14, fontFamily: F, fontWeight: 700, margin: "0 0 6px" }}>Двухфакторная аутентификация</p>
      <p style={{ color: "#9a9aa4", fontSize: 12.5, fontFamily: F, lineHeight: 1.5, margin: "0 0 12px" }}>Защитите вход кодом из Google Authenticator, Яндекс Ключа или другого TOTP-приложения.</p>
      {active && !qr ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#2fbf6b", fontSize: 13, fontFamily: F, fontWeight: 600 }}>✓ 2FA включена</span>
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Код для отключения" style={{ ...input, width: 190 }} />
          <button type="button" onClick={disable} disabled={busy || code.length !== 6} style={{ border: "1px solid #ff6b6b55", background: "#ff6b6b12", color: "#ff6b6b", borderRadius: 999, padding: "9px 14px", fontFamily: F, fontWeight: 600, cursor: "pointer" }}>Отключить</button>
        </div>
      ) : qr ? (
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <img src={qr} alt="QR-код настройки 2FA" width={180} height={180} style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
          <div style={{ flex: "1 1 220px" }}>
            <p style={{ color: "#9a9aa4", fontSize: 12, fontFamily: F, lineHeight: 1.5 }}>Отсканируйте QR-код в приложении-аутентификаторе, затем введите код.</p>
            <code style={{ color: "#c8c8d0", fontSize: 12, wordBreak: "break-all" }}>{secret}</code>
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 цифр" style={{ ...input, marginTop: 10 }} />
            <button type="button" onClick={confirm} disabled={busy || code.length !== 6} style={{ marginTop: 8, border: "none", background: "#0804ff", color: "#fff", borderRadius: 999, padding: "9px 16px", fontFamily: F, fontWeight: 600, cursor: "pointer" }}>Подтвердить 2FA</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={start} disabled={busy} style={{ border: "1px solid #0804ff66", background: "#0804ff12", color: "#9da0ff", borderRadius: 999, padding: "9px 16px", fontFamily: F, fontWeight: 600, cursor: "pointer" }}>{busy ? "Подготавливаю…" : "Включить 2FA"}</button>
      )}
      {message && <p role="status" style={{ color: message.includes("Ошибка") || message.includes("Неверный") ? "#ff6b6b" : "#2fbf6b", fontSize: 12.5, fontFamily: F, margin: "10px 0 0" }}>{message}</p>}
    </section>
  );
}
