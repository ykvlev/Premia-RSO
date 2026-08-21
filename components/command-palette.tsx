"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = {
  bg: "#08080a",
  overlay: "rgba(0,0,0,0.65)",
  card: "#0e0e12",
  card2: "#121216",
  border: "#2a2a34",
  text: "#f2f0ec",
  muted: "#9a9aa4",
  dim: "#6a6a72",
  accent: "#0804ff",
  green: "#2fbf6b",
  red: "#ff6b6b",
  amber: "#f5a623",
};

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  section: string;
  href?: string;
  action?: () => void;
  keywords?: string;
};

const STATIC_ITEMS: CmdItem[] = [
  { id: "home", label: "Главная", icon: "🏠", section: "Навигация", href: "/", keywords: "домой main" },
  { id: "cabinet", label: "Личный кабинет", icon: "📋", section: "Навигация", href: "/cabinet", keywords: "кабинет профиль заявки" },
  { id: "apply", label: "Подать заявку", icon: "➕", section: "Навигация", href: "/apply", keywords: "заявка подать создать" },
  { id: "profile", label: "Редактировать профиль", icon: "👤", section: "Навигация", href: "/profile", keywords: "профиль данные телефон" },
  { id: "status", label: "Проверить статус", icon: "🔍", section: "Навигация", href: "/status", keywords: "статус заявка проверка" },
  { id: "winners", label: "Победители", icon: "🏆", section: "Навигация", href: "/pobediteli", keywords: "победители лауреаты" },
  { id: "login", label: "Войти", icon: "🔑", section: "Навигация", href: "/login", keywords: "вход логин авторизация" },
  { id: "register", label: "Регистрация", icon: "📝", section: "Навигация", href: "/register", keywords: "регистрация создать аккаунт" },
];

const ADMIN_ITEMS: CmdItem[] = [
  { id: "admin-main", label: "Админ-панель", icon: "⚡", section: "Админ", href: "/admin", keywords: "админ заявки" },
  { id: "admin-super", label: "Супер-админ", icon: "🛡️", section: "Админ", href: "/admin/super", keywords: "суперадмин панель системы" },
  { id: "admin-mgmt", label: "Управление", icon: "📊", section: "Админ", href: "/admin/management", keywords: "управление поиск" },
  { id: "admin-jury", label: "Жюри", icon: "⚖️", section: "Админ", href: "/admin/jury", keywords: "жюри оценка" },
  { id: "admin-ranking", label: "Рейтинг", icon: "📈", section: "Админ", href: "/admin/ranking", keywords: "рейтинг оценки" },
  { id: "admin-protocol", label: "Протокол", icon: "📄", section: "Админ", href: "/admin/protocol", keywords: "протокол PDF" },
  { id: "admin-mailing", label: "Рассылка", icon: "📬", section: "Админ", href: "/admin/mailing", keywords: "рассылка email письма" },
  { id: "admin-nom", label: "Номинации", icon: "🎯", section: "Админ", href: "/admin/super/nominations", keywords: "номинации настройка" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = STATIC_ITEMS;

  const filtered = query.trim()
    ? allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          (item.keywords ?? "").toLowerCase().includes(q) ||
          (item.hint ?? "").toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q)
        );
      })
    : allItems;

  const adminFiltered = ADMIN_ITEMS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.keywords ?? "").toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, CmdItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  if (adminFiltered.length > 0) {
    grouped["Админ"] = adminFiltered;
  }

  const flatList = Object.values(grouped).flat();

  // Reset on open/query change
  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const runItem = useCallback(
    (item: CmdItem) => {
      setOpen(false);
      if (item.action) item.action();
      else if (item.href) router.push(item.href);
    },
    [router]
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flatList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flatList.length) % flatList.length);
    } else if (e.key === "Enter" && flatList[activeIdx]) {
      e.preventDefault();
      runItem(flatList[activeIdx]);
    }
  };

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
        background: C.overlay,
        backdropFilter: "blur(6px)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Найти страницу, действие..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: C.text,
              fontSize: 15,
              fontFamily: F,
              fontWeight: 500,
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.dim,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: "2px 6px",
              whiteSpace: "nowrap",
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 380, overflowY: "auto", padding: "6px 0" }}>
          {flatList.length === 0 ? (
            <p style={{ color: C.dim, fontSize: 13, fontFamily: F, textAlign: "center", padding: "24px 0" }}>
              Ничего не найдено
            </p>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section}>
                <p
                  style={{
                    color: C.dim,
                    fontSize: 10,
                    fontFamily: MONO,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1.2px",
                    padding: "10px 18px 4px",
                    margin: 0,
                  }}
                >
                  {section}
                </p>
                {items.map((item) => {
                  globalIdx++;
                  const idx = globalIdx;
                  const isActive = idx === activeIdx;
                  return (
                    <Link
                      key={item.id}
                      href={item.href ?? "#"}
                      data-cmd-idx={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        runItem(item);
                      }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 18px",
                        background: isActive ? `${C.accent}18` : "transparent",
                        borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent",
                        color: C.text,
                        textDecoration: "none",
                        transition: "background 0.08s",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontFamily: F, fontWeight: isActive ? 700 : 500 }}>
                        {item.label}
                      </span>
                      {item.href && (
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 11,
                            color: C.dim,
                            background: C.card2,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            padding: "1px 6px",
                          }}
                        >
                          {item.href}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "8px 18px",
            borderTop: `1px solid ${C.border}`,
            background: C.card2,
          }}
        >
          <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>
            ↑↓ навигация · ↵ выбор · esc закрыть
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.dim, fontFamily: MONO }}>
            Ctrl+K
          </span>
        </div>
      </div>
    </div>
  );
}
