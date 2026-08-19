"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Наверх"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9998,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "#121216",
        border: "1px solid #2a2a32",
        color: "#f2f0ec",
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: show ? "translateY(0)" : "translateY(60px)",
        opacity: show ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.2s",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#0804ff";
        e.currentTarget.style.borderColor = "#0804ff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#121216";
        e.currentTarget.style.borderColor = "#2a2a32";
      }}
    >
      ↑
    </button>
  );
}
