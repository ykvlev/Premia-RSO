"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(30);
    const t1 = setTimeout(() => setProgress(65), 200);
    const t2 = setTimeout(() => setProgress(90), 600);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #0804ff, #2fbf6b)",
          borderRadius: "0 2px 2px 0",
          transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 0 12px rgba(8,4,255,0.5)",
        }}
      />
    </div>
  );
}
