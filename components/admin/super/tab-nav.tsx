"use client";

import { useState } from "react";

const F = "var(--font-onest), sans-serif";

export type Tab = {
  id: string;
  label: string;
  icon: string;
  alert?: boolean;
};

export function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        padding: "0 4px",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: isActive ? "#121216" : "transparent",
              color: isActive ? "#f2f0ec" : "#6a6a72",
              border: isActive ? "1px solid #22222a" : "1px solid transparent",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 13,
              fontFamily: F,
              fontWeight: isActive ? 700 : 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = "#9a9aa4";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = "#6a6a72";
            }}
          >
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
            {t.alert && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#ff3b30",
                  boxShadow: "0 0 6px #ff3b3088",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
