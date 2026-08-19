"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Toast = { id: number; type: "success" | "error" | "info"; text: string };

const ToastCtx = createContext<{
  toast: (text: string, type?: Toast["type"]) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, type: Toast["type"] = "info") => {
    const id = ++_id;
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

const colors: Record<Toast["type"], { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(47,191,107,0.12)", border: "#2fbf6b", icon: "✓" },
  error: { bg: "rgba(255,107,107,0.12)", border: "#ff6b6b", icon: "✕" },
  info: { bg: "rgba(8,4,255,0.12)", border: "#0804ff", icon: "ℹ" },
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  const c = colors[t.type];
  const [show, setShow] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  return (
    <div
      onClick={onDismiss}
      style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: c.bg,
        backdropFilter: "blur(12px)",
        border: `1px solid ${c.border}44`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        minWidth: 260,
        maxWidth: 400,
        fontFamily: "var(--font-onest), sans-serif",
        fontSize: 14,
        color: "#f2f0ec",
        cursor: "pointer",
        transform: show ? "translateX(0)" : "translateX(120%)",
        opacity: show ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.2s",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ fontSize: 16, color: c.border }}>{c.icon}</span>
      {t.text}
    </div>
  );
}
