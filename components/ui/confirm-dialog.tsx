"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ConfirmOpts = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

const Ctx = createContext<(opts: ConfirmOpts) => Promise<boolean>>(() =>
  Promise.resolve(false),
);

export function useConfirm() {
  return useContext(Ctx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const [resolver, setResolver] = useState<(v: boolean) => void>(() => {});

  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((r) => setResolver(() => r));
  }, []);

  const close = (v: boolean) => {
    setOpts(null);
    resolver(v);
  };

  const F = "var(--font-onest), sans-serif";

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <div
          onClick={() => close(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#121216",
              border: "1px solid #2a2a32",
              borderRadius: 16,
              padding: "28px 26px",
              maxWidth: 400,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
              animation: "dialogIn 0.2s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <h3
              style={{
                color: "#f2f0ec",
                fontSize: 18,
                fontFamily: F,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {opts.title}
            </h3>
            <p
              style={{
                color: "#9a9aa4",
                fontSize: 14,
                fontFamily: F,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {opts.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => close(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #2a2a32",
                  color: "#9a9aa4",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontFamily: F,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opts.cancelLabel || "Отмена"}
              </button>
              <button
                onClick={() => close(true)}
                style={{
                  background: opts.danger ? "#ff4444" : "#0804ff",
                  border: "none",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontFamily: F,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {opts.confirmLabel || "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes dialogIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
    </Ctx.Provider>
  );
}
