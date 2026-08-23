"use client";
import { useEffect, useState } from "react";

const F = "var(--font-onest), sans-serif";

export function PwaInstallButton() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (installed || !prompt) return null;

  return (
    <button
      onClick={async () => { await prompt.prompt(); const c = await prompt.userChoice; if (c.outcome === "accepted") setInstalled(true); setPrompt(null); }}
      style={{ background: "#0804ff", color: "#fff", fontSize: 13, fontFamily: F, fontWeight: 600, border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer" }}
    >
      Установить приложение
    </button>
  );
}
