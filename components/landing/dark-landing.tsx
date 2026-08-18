"use client";
/*
 * Тёмный лендинг — адаптация Figma Make экспорта заказчика.
 * Отключаем строгие правила, которые бьют по машинному коду, безопасному на
 * рантайме: ref в inline-onClick замыканиях, deps локальных хуков, _-параметры.
 */
/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */

import { useState, useEffect, useRef } from "react";
import { REGIONS } from "@/lib/regions";
const brickPhoto = "/brand/photos/prize-2026.webp";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, MotionConfig, useSpring } from "motion/react";
import svgPaths from "./imports/trudkrut/svg-0bs0mmr6cx";
import UnionA from "./imports/Union/index";
import UnionB from "./imports/Union-1/index";
import UnionC from "./imports/Union-2/index";
import VectorA from "./imports/Vector/index";
import VectorB from "./imports/Vector-1/index";
import VectorC from "./imports/Vector-2/index";
import UnionD from "./imports/Union-3/index";
import VectorD from "./imports/Vector-3/index";
import Rso from "./imports/rso/index";
import VectorE from "./imports/Vector-4/index";

// ─── Data ────────────────────────────────────────────────────────────────────

type Nomination = {
  id: string;
  category: string;
  title: string;
  accent: string;
  description: string;
  criteria: string[];
};

// Перечень номинаций сезона 2026 (по ТЗ, разделы 1.1–1.4).
// Критерии оценки — до публикации положения о премии (пока пусто).
export const NOMINATIONS: Nomination[] = [
  // 1.1 — Организации, осуществляющие трудоустройство участников студотрядов
  {
    id: "01",
    category: "Работодатель",
    title: "Лучший работодатель по трудоустройству несовершеннолетней молодёжи (14–18 лет)",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто видит в подростках не временный кадровый резерв, а будущих специалистов отрасли. В фокусе — работодатели, выстраивающие карьерные треки для ребят 14–18 лет: наставничество, гибкие графики, охрана труда без ущерба для учёбы. Отмечаем тех, для кого труд несовершеннолетних — инструмент ранней профориентации и воспитания ответственности.",
    criteria: [],
  },
  {
    id: "02",
    category: "Работодатель",
    title: "Лучший работодатель по организации безопасных условий труда для молодёжи",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто ставит безопасность сотрудников на первое место. Для работодателей, которые доказывают на деле: защита жизни и здоровья — лучший способ удержать ценные кадры. Отмечаем организации, где безопасная работа начинается с первого дня трудоустройства.",
    criteria: [],
  },
  {
    id: "03",
    category: "Вуз",
    title:
      "Лучшая практика организации деятельности студотрядов в образовательной организации высшего образования",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто превращает штаб студенческих отрядов в вузе в современный центр карьеры и личностного роста. Для университетов, доказывающих на практике: студотряды — это не только трудоустройство, но и лучшая школа управленческих навыков и корпоративной культуры будущих специалистов.",
    criteria: [],
  },
  {
    id: "04",
    category: "Ссуз / школа",
    title:
      "Лучшая практика организации деятельности студотрядов в профессиональной и общеобразовательной организации",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто открывает мир реального труда для школьников и студентов колледжей через движение РСО. Для образовательных организаций, которые превращают студотряды из внеурочной деятельности в первую ступень карьеры — туда, где учебник встречается с настоящей работой на объекте.",
    criteria: [],
  },
  {
    id: "05",
    category: "Партнёр / НКО",
    title: "Работа СО смыслом",
    accent: "#0804ff",
    description:
      "Номинация для партнёров МООО «РСО», НКО, фондов и работодателей, которые видят в движении студотрядов инструмент развития региона и поддержки талантливой молодёжи. Для вас труд — не просто производственная задача, а инвестиция в будущее страны: вы создаёте экосистему, где энергия студентов встречается с реальными социальными вызовами.",
    criteria: [],
  },
  // 1.2 — Региональные отделения МООО «РСО» и участники движения
  {
    id: "06",
    category: "Совет ветеранов",
    title: "Лучший региональный совет ветеранов МООО «РСО»",
    accent: "#0804ff",
    description:
      "Номинация — признание тем, кто превращает историю движения в его будущее. Для региональных советов ветеранов связь поколений — это не дань уважения прошлому, а главный инструмент развития молодёжи. Вы создаёте систему живой памяти, где опыт первопроходцев БАМа и целины становится руководством для бойцов современных всероссийских проектов.",
    criteria: [],
  },
  {
    id: "07",
    category: "Физическое лицо",
    title: "Специальная номинация «Герой РСО»",
    accent: "#0804ff",
    description:
      "Номинация создана для того, чтобы страна знала своих настоящих героев нашего времени. Здесь награждают не за выслугу лет или должность, а за поступок, ставший нравственным ориентиром для всего движения. Это боец, командир или ветеран, оказавшийся лицом к лицу с чрезвычайной ситуацией — спасением людей или защитой интересов товарищей вопреки обстоятельствам.",
    criteria: [],
  },
  {
    id: "08",
    category: "Физическое лицо",
    title: "Персональная номинация «Лидер РСО»",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто берёт на себя ответственность за людей и результат в любой ситуации. Для любого члена Российских студенческих отрядов, который доказывает личным примером: лидерство — это не должность в штабной структуре, а готовность первым выйти из зоны комфорта ради общего дела.",
    criteria: [],
  },
  // 1.3 — Органы государственной власти субъектов РФ
  {
    id: "09",
    category: "Орган власти",
    title: "Лучший орган исполнительной власти по поддержке и развитию студотрядов",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто доверяет нам самое ценное — будущее страны. Кто видит в студенческих отрядах не просто молодёжное движение, а надёжную опору, способную решать реальные государственные задачи.",
    criteria: [],
  },
  {
    id: "10",
    category: "Орган власти",
    title: "Лучшая практика поддержки трудовых отрядов подростков",
    accent: "#0804ff",
    description:
      "Номинация для тех, кто видит в подростках тех, кому завтра продолжать историю страны. Кто даёт им платформу для роста, возможность попробовать себя в настоящей работе, научиться работать в команде и видеть результат своих усилий. Поддержка, которая помогает раскрыть способности, окрепнуть и понять, что их труд приносит пользу.",
    criteria: [],
  },
  // 1.4 — Средства массовой информации
  {
    id: "11",
    category: "СМИ",
    title: "Мастер слова «Событие года»",
    accent: "#0804ff",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
  {
    id: "12",
    category: "СМИ",
    title: "Мастер слова «Событие РСО в региональном аспекте»",
    accent: "#0804ff",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
  {
    id: "13",
    category: "СМИ",
    title: "«Едины делом: Трудовой сезон РСО в объективе»",
    accent: "#0804ff",
    description: "Описание номинации будет опубликовано в положении о премии.",
    criteria: [],
  },
];

const STAGES = [
  {
    num: "01",
    period: "1 августа — 1 ноября 2026",
    title: "Приём заявок",
    desc: "Организации, региональные отделения, работодатели, представители СМИ и физические лица подают заявки через официальный сайт премии. Каждая заявка содержит описание деятельности, достижений и подтверждающие документы. Экспертный оргкомитет регистрирует и проверяет полноту пакета документов.",
  },
  {
    num: "02",
    period: "1 ноября — 31 декабря 2026",
    title: "Экспертная оценка",
    desc: "Независимые эксперты из числа лидеров отрасли, педагогов и представителей власти оценивают заявки по утверждённым критериям. Каждая номинация рассматривается профильной экспертной группой. По итогам оценки формируется шорт-лист финалистов в каждой номинации.",
  },
  {
    num: "03",
    period: "Декабрь 2026 — январь 2027",
    title: "Объявление призеров премии",
    desc: "Финалисты представляют свои проекты и достижения членам Почётного жюри. Формат — очный питч или заочная защита, в зависимости от номинации. Жюри задаёт уточняющие вопросы и выносит финальное решение. Определяются победители в каждой из 11 номинаций.",
  },
  {
    num: "04",
    period: "17 февраля 2027",
    title: "Церемония награждения",
    desc: "Торжественная церемония вручения наград Национальной премии «Труд крут» в Москве. Победители получают статуэтки, дипломы и медиаподдержку со стороны РСО. Прямая трансляция, широкое освещение в федеральных СМИ. Лучшие практики сезона публикуются в официальном сборнике премии.",
  },
];

const STATS = [
  { num: 500, suffix: "+", label: "Организаций\nучастников" },
  { num: 13, suffix: "", label: "Номинаций\nсезона" },
  { num: 85, suffix: "", label: "Регионов\nстраны" },
  { num: 2024, suffix: "", label: "Реализуется\nс" },
];

const DEADLINE = new Date("2026-11-01T00:00:00");

// ─── Global styles (grain + glitch keyframes) ────────────────────────────────

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.innerHTML = `
      .nominations-scroll::-webkit-scrollbar { display:none; }
      .nominations-scroll { -ms-overflow-style:none; scrollbar-width:none; }
      .about-inner { position:relative; max-width:1200px; margin:0 auto; min-height:636px; }
      .about-photo-wrap { position:absolute; inset:0; overflow:hidden; }
      .about-right { position:absolute; top:0; right:40px; width:340px; height:100%;
        display:flex; flex-direction:column; justify-content:center; z-index:2; }
      @media (max-width: 900px) {
        .about-inner { min-height:0; }
        .about-photo-wrap { position:relative; height:min(64vw,420px); }
        .about-label { display:none; }
        .about-right { position:static; width:auto; height:auto;
          padding:56px 24px 64px; background:#0b0b0f; border-top:1px solid #2a2a32; }
      }
      @media (max-width: 820px) {
        .lp-header { padding:12px 14px !important; }
        .lp-header button { padding:8px 13px !important; font-size:12.5px !important; }
        .lp-nav { display:none !important; }
        .hdr-login { display:none !important; }
        .hero-grid { grid-template-columns:1fr !important; min-height:auto !important; }
        .hero-left { padding:104px 22px 40px !important; }
        .hero-right { padding:0 22px 64px !important; min-height:0 !important; overflow:hidden !important; }
        .hero-right img { width:min(320px,72vw) !important; max-width:100% !important; }
        .sec-pad { padding-left:22px !important; padding-right:22px !important;
          padding-top:64px !important; padding-bottom:64px !important; }
        .h-huge { font-size:clamp(40px,13vw,64px) !important; }
        .stages-line { display:none !important; }
        .stage-row { display:block !important; min-height:0 !important; }
        .stage-center { display:none !important; }
        .stage-off { display:none !important; }
        .stage-on { text-align:left !important; padding:26px 0 !important; }
        .stage-content { align-items:flex-start !important; text-align:left !important; }
        .contacts-grid { flex-direction:column !important; gap:40px !important; }
        .footer-cols { flex-direction:column !important; gap:28px !important; }
        .footer-pad { padding:40px 22px !important; }
      }
    `;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, []);
  return null;
}

// ─── Cursor spotlight ─────────────────────────────────────────────────────────
// Direct DOM mutation — no React re-renders on mousemove

function CursorSpotlight() {
  const divRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Только устройства с точным указателем (мышь) и без reduced-motion.
    const fine =
      window.matchMedia?.("(pointer: fine)").matches &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    setEnabled(true);

    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      if (divRef.current) {
        divRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(8,4,255,0.07) 0%, transparent 65%)`;
      }
    };
    const fn = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint); // не чаще кадра
    };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => {
      window.removeEventListener("mousemove", fn);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div
      ref={divRef}
      style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none" }}
    />
  );
}

// ─── Film grain ───────────────────────────────────────────────────────────────
// Direct SVG attribute mutation — no React re-renders on interval

function FilmGrain() {
  // Статичное зерно: фильтр считается один раз (без анимации seed каждые 120мс,
  // которая заставляла браузер пересчитывать шум на весь экран ~8 раз/сек).
  // Скрыто на мобиле и при prefers-reduced-motion (CSS-класс film-grain).
  return (
    <div
      className="film-grain"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        pointerEvents: "none",
        opacity: 0.038,
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <filter id="grain-f">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves="3"
            seed="7"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-f)" />
      </svg>
    </div>
  );
}

// ─── Plain heading (glitch removed) ──────────────────────────────────────────

function GlitchHeading({ text, style }: { text: string; style?: React.CSSProperties }) {
  return <span style={style}>{text}</span>;
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ num, suffix }: { num: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          let t0 = 0;
          const dur = num > 100 ? 1800 : 1000;
          const tick = (ts: number) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCount(Math.round(eased * num));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [num]);
  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  // Детерминированное начальное значение (нули) — одинаково на сервере и при
  // первом рендере клиента, иначе гидратация падает (SSR-время ≠ время загрузки,
  // усугубляется кэшем страницы). Реальные значения включаем после монтирования.
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    setTime(calc());
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

function useScrollVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ size = 128 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size * (50 / 128),
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "47.25%",
          right: "-0.02%",
          transform: "translateY(-50%)",
          bottom: 0,
          height: "53.25%",
        }}
      >
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 67.7938 26.6252"
        >
          <path d={svgPaths.p50a4e80} fill="white" />
          <path d={svgPaths.p1ac7bd80} fill="white" />
          <path d={svgPaths.p35bd4300} fill="white" />
          <path d={svgPaths.p31e8ff00} fill="white" />
          <path d={svgPaths.p712e500} fill="white" />
          <path d={svgPaths.p1a592570} fill="white" />
          <path d={svgPaths.p152e3b00} fill="white" />
          <path d={svgPaths.p6ce080} fill="white" />
          <path d={svgPaths.p3436fc00} fill="white" />
          <path d={svgPaths.p3df5b200} fill="white" />
          <path d={svgPaths.p18366430} fill="white" />
          <path d={svgPaths.p2fc5b380} fill="white" />
          <path d={svgPaths.p27686780} fill="white" />
          <path d={svgPaths.p1d93d2f0} fill="white" />
          <path d={svgPaths.p16fd2580} fill="white" />
          <path d={svgPaths.p2c08f400} fill="white" />
          <path d={svgPaths.pd05e380} fill="white" />
          <path d={svgPaths.p2a3b6700} fill="white" />
          <path d={svgPaths.pff0b780} fill="white" />
          <path d={svgPaths.p1ae8fa20} fill="white" />
          <path d={svgPaths.p20b8cf00} fill="white" />
          <path d={svgPaths.p17033540} fill="white" />
          <path d={svgPaths.p1992d880} fill="white" />
          <path d={svgPaths.p2ca39480} fill="white" />
          <path d={svgPaths.p11d10c80} fill="white" />
          <path d={svgPaths.p1be069f0} fill="white" />
          <path d={svgPaths.p14fff400} fill="white" />
          <path d={svgPaths.p29ac4280} fill="white" />
        </svg>
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: "58.64%" }}>
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 53.125 50"
        >
          <path d={svgPaths.p2ce523f0} fill="white" />
          <path d={svgPaths.p3ea8b980} fill="white" />
          <path d={svgPaths.p29840f00} fill="white" />
          <path
            clipRule="evenodd"
            d={svgPaths.p2b2f6500}
            fill="white"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({
  nominationsRef,
}: {
  nominationsRef: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scroll = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <header
      className="fixed top-0 right-0 left-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,8,10,0.96)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #2a2a32" : "1px solid transparent",
      }}
    >
      <div className="lp-header flex items-center justify-between px-12 py-4">
        <Logo size={120} />
        <nav className="lp-nav flex items-center gap-7">
          {[
            { label: "О премии", action: () => {} },
            { label: "Номинации", action: () => scroll(nominationsRef) },
            { label: "Этапы", action: () => {} },
            { label: "Зал славы", action: () => router.push("/pobediteli") },
            { label: "Контакты", action: () => {} },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="cursor-pointer border-0 bg-transparent text-[14px] font-medium text-[#9a9aa4] transition-colors duration-200 hover:text-white"
              style={{ fontFamily: "var(--font-onest), sans-serif" }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/vhod")}
            className="hdr-login cursor-pointer rounded-full border border-[#2a2a32] bg-transparent px-5 py-3 text-[15px] font-medium text-[#f2f0ec] transition-all duration-200 hover:border-[#4a4a56]"
            style={{ fontFamily: "var(--font-onest), sans-serif" }}
          >
            Войти
          </button>
          <button
            onClick={() => router.push("/apply")}
            className="cursor-pointer rounded-full border-0 bg-[#0804ff] px-6 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-[#0a06ff] active:scale-95"
            style={{ fontFamily: "var(--font-onest), sans-serif" }}
          >
            Подать заявку
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 28 }}>
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          color: "#f2f0ec",
          fontSize: 36,
          lineHeight: 1,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 700,
          letterSpacing: "-1px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span
        style={{
          color: "#6a6a72",
          fontSize: 10,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Hero({
  nominationsRef,
  startAt,
  endAt,
}: {
  nominationsRef: React.RefObject<HTMLElement | null>;
  startAt?: string;
  endAt?: string;
}) {
  const router = useRouter();
  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : DEADLINE;
  const nowMs = Date.now();
  const beforeOpen = start ? nowMs < start.getTime() : false;
  const closed = nowMs >= end.getTime();
  const cd = useCountdown(beforeOpen ? start! : end);
  const cdLabel = beforeOpen
    ? "До старта приёма заявок · МСК"
    : closed
      ? "Приём заявок завершён"
      : "До конца приёма заявок · МСК";

  // 3D-наклон кирпича за курсором (мягкий, на пружинах).
  const tiltX = useSpring(0, { stiffness: 120, damping: 16 });
  const tiltY = useSpring(0, { stiffness: 120, damping: 16 });
  const onBrickMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tiltY.set(px * 24);
    tiltX.set(-py * 24);
  };
  const onBrickLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <section
      className="hero-grid"
      style={{
        background: "#08080a",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid #2a2a32",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* Blue glow behind brick */}
      <div
        style={{
          position: "absolute",
          right: "5%",
          top: "40%",
          transform: "translateY(-50%)",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,4,255,0.2) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* ── LEFT ── */}
      <div
        className="hero-left"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          paddingTop: 120,
          paddingBottom: 40,
          paddingLeft: 80,
          paddingRight: 56,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              color: "#e8e6e2",
              fontSize: "clamp(18px, 2vw, 26px)",
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            национальная премия —
          </motion.p>

          {/* ТРУД КРУТ — векторный логотип из Figma */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            style={{ margin: "4px 0 0", lineHeight: 0 }}
          >
            <span className="sr-only">Труд Крут</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hero-wordmark.svg"
              alt=""
              aria-hidden="true"
              style={{
                display: "block",
                width: "clamp(320px, 44vw, 600px)",
                height: "auto",
              }}
            />
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              color: "#9a9aa4",
              fontSize: 16,
              fontFamily: "var(--font-onest), sans-serif",
              lineHeight: 1.65,
              marginTop: 36,
              maxWidth: 400,
            }}
          >
            Ты вкладываешься — страна замечает.
            <br />
            Подай заявку и получи заслуженное признание.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.45 }}
            style={{ display: "flex", gap: 12, marginTop: 36 }}
          >
            <button
              onClick={() => router.push("/apply")}
              style={{
                background: "#0804ff",
                color: "white",
                fontSize: 15,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                padding: "13px 28px",
                borderRadius: 999,
                border: 0,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#0603cc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0804ff")}
            >
              Подать заявку
            </button>
            <button
              onClick={() =>
                nominationsRef.current?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                background: "transparent",
                border: "1px solid #2a2a32",
                color: "#f2f0ec",
                fontSize: 15,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                padding: "13px 28px",
                borderRadius: 999,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1a1a22")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Номинации
            </button>
          </motion.div>
        </div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <p
            style={{
              color: "#6a6a72",
              fontSize: 11,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {cdLabel}
          </p>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <CountdownBox value={cd.days} label="дней" />
            <CountdownBox value={cd.hours} label="часов" />
            <CountdownBox value={cd.minutes} label="минут" />
            <CountdownBox value={cd.seconds} label="секунд" />
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT: brick ── */}
      <motion.div
        className="hero-right"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onMouseMove={onBrickMove}
        onMouseLeave={onBrickLeave}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          perspective: 1200,
        }}
      >
        <motion.img
          src={brickPhoto}
          alt="Приз премии Труд Крут"
          decoding="async"
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "min(640px, 52vw)",
            height: "auto",
            objectFit: "contain",
            display: "block",
            rotateX: tiltX,
            rotateY: tiltY,
            transformPerspective: 1200,
            filter:
              "drop-shadow(0 44px 88px rgba(0,0,0,0.7)) drop-shadow(0 12px 32px rgba(0,0,0,0.55))",
          }}
        />
      </motion.div>
    </section>
  );
}

// ─── Pattern band (individual SVG marquee, white) ─────────────────────────────

const H = 44; // render height in px for all elements

// [Component, viewBox-width, viewBox-height]
const PATTERN_ITEMS: [React.ComponentType, number, number][] = [
  [UnionA, 96.8779, 63.7678],
  [UnionB, 174.135, 63.7676],
  [UnionC, 86.7744, 82.5898],
  [VectorA, 115.822, 116.477],
  [VectorB, 125.083, 53.9573],
  [VectorC, 192.529, 63.7677],
  [UnionD, 120.468, 115.514],
  [VectorD, 66.2203, 122.63],
  [Rso, 206.019, 52.731],
  [VectorE, 117.797, 110.799],
];

const GAP = 56;

// total width of one set of items + gaps
const STRIP_W = PATTERN_ITEMS.reduce(
  (acc, [, w, h]) => acc + Math.round((w / h) * H) + GAP,
  0,
);

function PatternBand() {
  return (
    <div
      style={{
        height: H + 36,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        background: "#08080a",
        borderTop: "1px solid #2a2a32",
        borderBottom: "1px solid #2a2a32",
        // expose --fill-0 as white so all SVG fills inherit it
        ["--fill-0" as string]: "white",
      }}
    >
      <motion.div
        style={{ display: "flex", alignItems: "center", flexShrink: 0, gap: GAP }}
        animate={{ x: [0, -STRIP_W] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {/* two copies for seamless loop */}
        {[0, 1].map((copy) =>
          PATTERN_ITEMS.map(([Comp, vw, vh], i) => {
            const w = Math.round((vw / vh) * H);
            return (
              <div
                key={`${copy}-${i}`}
                style={{
                  width: w,
                  height: H,
                  flexShrink: 0,
                  position: "relative",
                  opacity: 0.9,
                }}
              >
                <Comp />
              </div>
            );
          }),
        )}
      </motion.div>
    </div>
  );
}

// ─── About section (photo + stats) ────────────────────────────────────────────

/** Подпись-аннотация поверх фото: синяя точка + текст. */
function AboutLabel({
  text,
  style,
  visible,
  delay,
}: {
  text: string;
  style: React.CSSProperties;
  visible: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="about-label"
      initial={{ opacity: 0 }}
      animate={visible ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        zIndex: 1,
        maxWidth: 200,
        ...style,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#0804ff",
          marginTop: 4,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: "#e8e6e2",
          fontSize: 12,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          lineHeight: 1.4,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </span>
    </motion.div>
  );
}

function AboutSection({ stats }: { stats?: LiveStats }) {
  const { ref, visible } = useScrollVisible(0.1);
  // Живые счётчики из БД (если переданы) — иначе статические ориентиры.
  const liveStats = stats
    ? [
        { num: stats.applications, suffix: "", label: "Заявок\nподано" },
        { num: stats.nominations, suffix: "", label: "Номинаций\nсезона" },
        { num: stats.regions, suffix: "", label: "Регионов\nучаствует" },
        { num: 2024, suffix: "", label: "Реализуется\nс" },
      ]
    : STATS;
  return (
    <section
      ref={ref}
      style={{ background: "#08080a", borderBottom: "1px solid #2a2a32" }}
    >
      <div className="about-inner">
        {/* Full-bleed ceremony photo with overlays */}
        <div className="about-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/photos/about-ceremony.webp"
            alt="Церемония Национальной премии «Труд крут»"
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 32%",
              filter: "grayscale(1) contrast(1.18) brightness(0.72)",
              display: "block",
            }}
          />
          {/* horizontal darkening — readable title (left) + stats (right) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(8,8,10,0.55) 0%, rgba(8,8,10,0.12) 34%, rgba(8,8,10,0.72) 74%, rgba(8,8,10,0.95) 100%)",
            }}
          />
          {/* vertical darkening — top/bottom vignette for labels */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(8,8,10,0.5) 0%, rgba(8,8,10,0) 28%, rgba(8,8,10,0) 62%, rgba(8,8,10,0.6) 100%)",
            }}
          />

          {/* Overlay title — национальная премия — ТРУД КРУТ (вектор) */}
          <div
            style={{
              position: "absolute",
              left: "33%",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
            }}
          >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              style={{
                color: "#e8e6e2",
                fontSize: "clamp(12px, 1.3vw, 16px)",
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: 6,
                marginLeft: 4,
              }}
            >
              национальная премия —
            </p>
            <span className="sr-only">Труд Крут</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hero-wordmark.svg"
              alt=""
              aria-hidden="true"
              style={{
                display: "block",
                width: "clamp(240px, 30vw, 380px)",
                height: "auto",
              }}
            />
          </motion.div>
          </div>

          {/* Annotation labels over the photo */}
          <AboutLabel
            style={{ top: "30%", left: "7%" }}
            text={"момент, который\nвы ждали весь год"}
            visible={visible}
            delay={0.5}
          />
          <AboutLabel
            style={{ bottom: "17%", left: "17%" }}
            text={"главная премия\nкрупнейшего движения"}
            visible={visible}
            delay={0.6}
          />
          <AboutLabel
            style={{ bottom: "19%", left: "46%" }}
            text={"запомни мгновение"}
            visible={visible}
            delay={0.7}
          />
        </div>

        {/* Right column — О ПРЕМИИ + статистика */}
        <div className="about-right">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <h2
              style={{
                color: "#f2f0ec",
                fontSize: 44,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 800,
                lineHeight: 1.05,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: 24,
              }}
            >
              О ПРЕМИИ
            </h2>
            <p
              style={{
                color: "#b8b8c0",
                fontSize: 15,
                fontFamily: "var(--font-onest), sans-serif",
                lineHeight: 1.65,
                marginBottom: 20,
              }}
            >
              Национальная премия «Труд крут» учреждена Молодёжной общероссийской
              общественной организацией «Российские Студенческие Отряды» для признания
              достижений тех, кто вносит наибольший вклад в развитие молодёжного трудового
              движения страны.
            </p>
            <p
              style={{
                color: "#b8b8c0",
                fontSize: 15,
                fontFamily: "var(--font-onest), sans-serif",
                lineHeight: 1.65,
                marginBottom: 32,
              }}
            >
              Работодатели, региональные отделения, учебные заведения, органы власти и
              наставники — все они формируют будущее трудового движения. Премия — способ
              сказать им спасибо.
            </p>
            {/* stat grid */}
            <div
              className="grid grid-cols-2 gap-0"
              style={{
                border: "1px solid #2a2a32",
                background: "rgba(11,11,15,0.55)",
                backdropFilter: "blur(6px)",
              }}
            >
              {liveStats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                  className="flex flex-col gap-1 p-5"
                  style={{
                    borderRight: i % 2 === 0 ? "1px solid #2a2a32" : "none",
                    borderBottom: i < 2 ? "1px solid #2a2a32" : "none",
                  }}
                >
                  <p
                    style={{
                      color: "#0804ff",
                      fontSize: 38,
                      fontFamily: "var(--font-onest), sans-serif",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    <AnimatedCounter num={s.num} suffix={s.suffix} />
                  </p>
                  <p
                    style={{
                      color: "#9a9aa4",
                      fontSize: 12,
                      fontFamily: "var(--font-onest), sans-serif",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      whiteSpace: "pre-line",
                      lineHeight: 1.4,
                    }}
                  >
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Nomination modal ─────────────────────────────────────────────────────────

function NominationModal({
  nom,
  onClose,
  onApply,
}: {
  nom: (typeof NOMINATIONS)[0];
  onClose: () => void;
  onApply: (id: string) => void;
}) {
  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "#121216",
          border: "1px solid #2a2a32",
          width: "100%",
          maxWidth: 520,
          padding: 40,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            background: "transparent",
            border: "1px solid #2a2a32",
            color: "#9a9aa4",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#f2f0ec";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f2f0ec";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#9a9aa4";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a32";
          }}
        >
          ×
        </button>

        {/* Header */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, paddingRight: 40 }}
        >
          <p
            style={{
              color: "#9a9aa4",
              fontSize: 11,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.72px",
            }}
          >
            {nom.category}
          </p>
          <h2
            style={{
              color: "#f2f0ec",
              fontSize: 28,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 800,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {nom.title}
          </h2>
        </div>

        {/* Description */}
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 15,
            fontFamily: "var(--font-onest), sans-serif",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {nom.description}
        </p>

        {/* Criteria — показываем только когда заданы (до положения о премии пусто) */}
        {nom.criteria.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p
            style={{
              color: "#9a9aa4",
              fontSize: 11,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.72px",
            }}
          >
            Критерии оценки
          </p>
          {nom.criteria.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: nom.accent,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <p
                style={{
                  color: "#f2f0ec",
                  fontSize: 14,
                  fontFamily: "var(--font-onest), sans-serif",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {c}
              </p>
            </div>
          ))}
        </div>
        )}

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            onApply(nom.id);
          }}
          style={{
            alignSelf: "flex-start",
            background: nom.accent,
            color: "white",
            fontSize: 15,
            fontFamily: "var(--font-onest), sans-serif",
            fontWeight: 500,
            padding: "13px 28px",
            border: 0,
            cursor: "pointer",
            borderRadius: 999,
            marginTop: 4,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Подать заявку →
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Nomination card (compact, opens modal on click) ─────────────────────────

function NominationCard({
  nom,
  onOpen,
}: {
  nom: (typeof NOMINATIONS)[0];
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        background: hovered ? "#0e0e14" : "#08080a",
        border: `1px solid ${hovered ? nom.accent + "55" : "#2a2a32"}`,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        height: "100%",
        padding: "20px",
        gap: 10,
        boxSizing: "border-box",
      }}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          color: "#9a9aa4",
          fontSize: 11,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.72px",
        }}
      >
        {nom.category}
      </span>
      <p
        style={{
          color: nom.accent,
          fontSize: 28,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 800,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {nom.id}
      </p>
      <p
        style={{
          color: "#f2f0ec",
          fontSize: 15,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          lineHeight: 1.38,
          margin: 0,
        }}
      >
        {nom.title}
      </p>
      <span
        style={{
          color: hovered ? nom.accent : "#9a9aa4",
          fontSize: 13,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          transition: "color 0.2s",
          marginTop: 4,
        }}
      >
        Подробнее →
      </span>
    </div>
  );
}

// ─── Nominations section (horizontal drag-scroll) ─────────────────────────────

function NominationsSection({
  sectionRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const { ref, visible } = useScrollVisible(0.05);
  const [openNom, setOpenNom] = useState<(typeof NOMINATIONS)[0] | null>(null);
  const [cat, setCat] = useState<string>("Все");
  const cats = ["Все", ...Array.from(new Set(NOMINATIONS.map((n) => n.category)))];
  const shownNoms = NOMINATIONS.filter((n) => cat === "Все" || n.category === cat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const handleApply = (_id: string) => router.push("/apply");

  const onDown = (e: React.MouseEvent) => {
    drag.current = {
      active: true,
      startX: e.pageX,
      scrollLeft: scrollRef.current!.scrollLeft,
      moved: false,
    };
    scrollRef.current!.style.cursor = "grabbing";
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current.active) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    scrollRef.current!.scrollLeft = drag.current.scrollLeft - dx;
  };
  const onUp = () => {
    drag.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      style={{
        background: "#08080a",
        borderBottom: "1px solid #2a2a32",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        ref={ref}
        style={{
          padding: "100px 80px 48px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            color: "#f2f0ec",
            fontSize: 64,
            fontFamily: "var(--font-onest), sans-serif",
            fontWeight: 800,
            lineHeight: 1,
            textTransform: "uppercase",
            letterSpacing: "2px",
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transition: "all 0.7s ease",
          }}
        >
          <GlitchHeading text="Номинации" />
        </p>
        <p
          style={{
            color: "#6a6a72",
            fontSize: 13,
            fontFamily: "var(--font-onest), sans-serif",
            fontWeight: 500,
            paddingBottom: 8,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.3s",
          }}
        >
          перетащите →
        </p>
      </div>

      {/* Фильтр по категориям */}
      <div
        className="sec-pad"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "0 80px 28px",
        }}
      >
        {cats.map((c) => {
          const on = c === cat;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                background: on ? "#0804ff" : "transparent",
                border: `1px solid ${on ? "#0804ff" : "#2a2a32"}`,
                color: on ? "#fff" : "#9a9aa4",
                fontSize: 13,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Horizontal scroll rail */}
      <div
        ref={scrollRef}
        className="nominations-scroll"
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{
          display: "flex",
          overflowX: "auto",
          cursor: "grab",
          userSelect: "none",
          paddingLeft: 80,
          paddingBottom: 80,
          borderTop: "1px solid #2a2a32",
        }}
      >
        {shownNoms.map((nom, i) => (
          <motion.div
            key={nom.id}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
            onClick={() => {
              if (!drag.current.moved) setOpenNom(nom);
            }}
            style={{
              minWidth: 320,
              maxWidth: 320,
              borderRight: "1px solid #2a2a32",
              padding: "40px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              transition: "background 0.2s",
              flexShrink: 0,
            }}
            whileHover={{ backgroundColor: "#0e0e14" }}
          >
            <span
              style={{
                color: "#6a6a72",
                fontSize: 11,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {nom.category}
            </span>
            <p
              style={{
                color: "#0804ff",
                fontSize: 48,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 800,
                lineHeight: 1,
                margin: 0,
              }}
            >
              {nom.id}
            </p>
            <p
              style={{
                color: "#f2f0ec",
                fontSize: 16,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                lineHeight: 1.4,
                margin: 0,
                flex: 1,
              }}
            >
              {nom.title}
            </p>
            <span
              style={{
                color: "#9a9aa4",
                fontSize: 13,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
              }}
            >
              Подробнее →
            </span>
          </motion.div>
        ))}
        {/* Blue cap cell */}
        <div
          style={{
            minWidth: 320,
            background: "#0804ff",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            padding: "40px 32px",
          }}
        >
          <p
            style={{
              color: "white",
              fontSize: 48,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 800,
              lineHeight: 1,
              margin: 0,
              opacity: 0.3,
            }}
          >
            →
          </p>
        </div>
        <div style={{ minWidth: 80, flexShrink: 0 }} />
      </div>

      <AnimatePresence>
        {openNom && (
          <NominationModal
            nom={openNom}
            onClose={() => setOpenNom(null)}
            onApply={handleApply}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Stages section (centered alternating timeline) ───────────────────────────

function StageContent({
  stage,
  align,
}: {
  stage: (typeof STAGES)[0];
  align: "left" | "right";
}) {
  return (
    <div
      className="stage-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      <p
        style={{
          color: "#0804ff",
          fontSize: 72,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {stage.num}
      </p>
      <p
        style={{
          color: "#9a9aa4",
          fontSize: 11,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.72px",
        }}
      >
        {stage.period}
      </p>
      <p
        style={{
          color: "#f2f0ec",
          fontSize: 22,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 700,
          lineHeight: 1.25,
          marginTop: 4,
        }}
      >
        {stage.title}
      </p>
      <p
        style={{
          color: "#9a9aa4",
          fontSize: 15,
          fontFamily: "var(--font-onest), sans-serif",
          lineHeight: 1.75,
          maxWidth: 420,
          textAlign: align,
        }}
      >
        {stage.desc}
      </p>
    </div>
  );
}

function StagesSection() {
  const { ref, visible } = useScrollVisible(0.05);
  return (
    <section
      className="sec-pad"
      style={{
        background: "#08080a",
        padding: "100px 80px",
        borderBottom: "1px solid #2a2a32",
        position: "relative",
      }}
    >
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 72 }}>
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transition: "all 0.7s ease",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 64,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 800,
              lineHeight: 1.1,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            <GlitchHeading text="Этапы" />
          </p>
        </div>

        {/* Centered alternating timeline */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* center line */}
          <div
            className="stages-line"
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "#2a2a32",
              transform: "translateX(-50%)",
            }}
          />

          {STAGES.map((stage, i) => {
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={i}
                className="stage-row"
                initial={{ opacity: 0, x: isLeft ? -32 : 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "flex-start",
                  minHeight: 160,
                  borderBottom: i < STAGES.length - 1 ? "1px solid #2a2a32" : "none",
                }}
              >
                {/* Left cell */}
                <div
                  className={isLeft ? "stage-on" : "stage-off"}
                  style={{
                    padding: "40px 48px 40px 0",
                    textAlign: isLeft ? "right" : "left",
                    opacity: isLeft ? 1 : 0,
                    pointerEvents: isLeft ? "auto" : "none",
                  }}
                >
                  {isLeft && <StageContent stage={stage} align="right" />}
                </div>

                {/* Center dot */}
                <div
                  className="stage-center"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: 44,
                    position: "relative",
                    width: 1,
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#0804ff",
                      border: "3px solid #08080a",
                      flexShrink: 0,
                      zIndex: 1,
                      boxShadow: `0 0 0 1px #0804ff`,
                    }}
                  />
                </div>

                {/* Right cell */}
                <div
                  className={!isLeft ? "stage-on" : "stage-off"}
                  style={{
                    padding: "40px 0 40px 48px",
                    textAlign: "left",
                    opacity: !isLeft ? 1 : 0,
                    pointerEvents: !isLeft ? "auto" : "none",
                  }}
                >
                  {!isLeft && <StageContent stage={stage} align="left" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ (аккордеон) ──────────────────────────────────────────────────────────

const FAQ: { q: string; a: string }[] = [
  {
    q: "Кто может участвовать в премии?",
    a: "Организации-работодатели, вузы и ссузы, региональные отделения и участники движения РСО, органы государственной власти, СМИ, а также физические лица — в зависимости от номинации. Подходящие типы заявителей подсказываются при выборе номинации в форме.",
  },
  {
    q: "Нужно ли регистрироваться, чтобы подать заявку?",
    a: "Нет. Заявка подаётся без входа — на странице «Подать заявку». После первой заявки мы автоматически создадим для вас личный кабинет и пришлём логин и пароль на указанную почту.",
  },
  {
    q: "До какого числа идёт приём заявок?",
    a: "Приём заявок открыт до 1 ноября 2026 года. Точные сроки и условия — в положении о премии.",
  },
  {
    q: "Можно ли подать заявки на несколько номинаций?",
    a: "Да. Одним аккаунтом (по вашему email) можно подать несколько заявок на разные номинации — все они будут видны в личном кабинете.",
  },
  {
    q: "Как узнать статус заявки?",
    a: "В личном кабинете отображаются все ваши заявки и их статусы (отправлена, на рассмотрении, решение). Об изменениях статуса и комментариях экспертов мы также сообщаем письмом.",
  },
  {
    q: "Что нужно приложить к заявке?",
    a: "Данные номинанта, описание деятельности и достижений, при необходимости — фотографию и ссылки на материалы. Организация подтягивается автоматически по ИНН.",
  },
  {
    q: "Участие в премии платное?",
    a: "Нет, участие полностью бесплатное.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #2a2a32" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "24px 0",
          textAlign: "left",
        }}
      >
        <span
          style={{
            color: "#f2f0ec",
            fontSize: 18,
            fontFamily: "var(--font-onest), sans-serif",
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {q}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1px solid #2a2a32",
            color: "#0804ff",
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: open ? "rotate(45deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? 320 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease",
        }}
      >
        <p
          style={{
            color: "#9a9aa4",
            fontSize: 15,
            fontFamily: "var(--font-onest), sans-serif",
            lineHeight: 1.65,
            margin: 0,
            padding: "0 0 24px",
            maxWidth: 760,
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

// ─── Geography (регионы-участники) ────────────────────────────────────────────

function GeographySection({
  regionCounts,
}: {
  regionCounts?: Record<string, number>;
}) {
  const [showAll, setShowAll] = useState(false);
  const counts = regionCounts ?? {};
  const extras = Object.keys(counts).filter((r) => !REGIONS.includes(r));
  const all = [...REGIONS.filter((r) => r !== "Другой регион"), ...extras];
  const active = all
    .filter((r) => (counts[r] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const inactive = all.filter((r) => !((counts[r] ?? 0) > 0));
  const activeCount = active.length;
  const totalApps = Object.values(counts).reduce((s, n) => s + n, 0);
  const totalRegions = all.length;
  const font = "var(--font-onest), sans-serif";
  const plural = (n: number, one: string, few: string, many: string) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  return (
    <section
      className="sec-pad"
      style={{
        background: "#08080a",
        padding: "100px 80px",
        borderBottom: "1px solid #2a2a32",
      }}
    >
      <p
        className="h-huge"
        style={{
          color: "#f2f0ec",
          fontSize: 64,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 800,
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "2px",
          marginBottom: 20,
        }}
      >
        География премии
      </p>
      {activeCount > 0 ? (
        <>
          {/* Крупные цифры вместо стены регионов */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 48,
              alignItems: "flex-end",
              marginBottom: 44,
            }}
          >
            {[
              { n: activeCount, l: `${plural(activeCount, "регион", "региона", "регионов")} России` },
              { n: totalApps, l: `${plural(totalApps, "заявка", "заявки", "заявок")} подано` },
            ].map((s) => (
              <div key={s.l}>
                <div
                  style={{
                    color: "#0804ff",
                    fontSize: "clamp(44px, 11vw, 76px)",
                    fontFamily: font,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-2px",
                  }}
                >
                  {s.n}
                </div>
                <div style={{ color: "#9a9aa4", fontSize: 15, fontFamily: font, marginTop: 8 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          {/* Активные регионы — заметными чипами */}
          <p
            style={{
              color: "#6a6a72",
              fontSize: 12,
              fontFamily: font,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
              margin: "0 0 14px",
            }}
          >
            Уже с нами
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 34 }}>
            {active.map((region) => (
              <span
                key={region}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: font,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: "rgba(8,4,255,0.16)",
                  border: "1px solid rgba(8,4,255,0.85)",
                  borderRadius: 999,
                  padding: "10px 16px",
                }}
              >
                {region}
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 800,
                    background: "#0804ff",
                    borderRadius: 999,
                    padding: "2px 9px",
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {counts[region] ?? 0}
                </span>
              </span>
            ))}
          </div>

          {/* Полоса охвата */}
          <div style={{ maxWidth: 520 }}>
            <div style={{ height: 6, borderRadius: 999, background: "#16161c", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(2, (activeCount / totalRegions) * 100)}%`,
                  background: "linear-gradient(90deg,#0804ff,#5b8def)",
                  borderRadius: 999,
                }}
              />
            </div>
            <p style={{ color: "#6a6a72", fontSize: 13, fontFamily: font, margin: "10px 0 0" }}>
              {activeCount} из {totalRegions} субъектов РФ уже участвуют — присоединяйся.
            </p>
          </div>
        </>
      ) : (
        <p style={{ color: "#9a9aa4", fontSize: 18, fontFamily: font, lineHeight: 1.5, maxWidth: 640 }}>
          Премия открыта для всех {totalRegions} субъектов Российской Федерации.
          Стань первым в своём регионе.
        </p>
      )}

      {/* Полный список регионов — по кнопке, чтобы не грузить стеной */}
      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            color: "#9a9aa4",
            border: "1px solid #2a2a32",
            borderRadius: 999,
            padding: "9px 18px",
            fontSize: 14,
            fontFamily: font,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showAll ? "Свернуть" : `Все регионы России (${totalRegions})`}
          <span style={{ fontSize: 10 }}>{showAll ? "▲" : "▼"}</span>
        </button>

        {showAll && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 18,
              maxHeight: 300,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {[...active, ...inactive].map((region) => {
              const on = (counts[region] ?? 0) > 0;
              return (
                <span
                  key={region}
                  style={{
                    fontFamily: font,
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    color: on ? "#fff" : "#5a5a62",
                    background: on ? "rgba(8,4,255,0.16)" : "transparent",
                    border: `1px solid ${on ? "rgba(8,4,255,0.7)" : "#1a1a20"}`,
                    borderRadius: 999,
                    padding: "6px 12px",
                  }}
                >
                  {region}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section
      className="sec-pad"
      style={{
        background: "#08080a",
        padding: "100px 80px",
        borderBottom: "1px solid #2a2a32",
      }}
    >
      <p
        className="h-huge"
        style={{
          color: "#f2f0ec",
          fontSize: 64,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 800,
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "2px",
          marginBottom: 48,
        }}
      >
        Вопросы
      </p>
      <div style={{ maxWidth: 900 }}>
        {FAQ.map((item, i) => (
          <FaqItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}

// ─── Contacts & docs ──────────────────────────────────────────────────────────

function ContactsSection() {
  const { ref, visible } = useScrollVisible();
  const docs = [
    "Положение о Национальной премии 2026",
    "Положение о конкурсе Лучшая практика организации деятельности студенческих отрядов в образовательной организации высшего образования",
    "Положение Лучшая практика организации деятельности студенческих отрядов в профессиональной образовательной организации и общеобразовательной организации",
  ];
  return (
    <section
      className="sec-pad"
      style={{
        background: "#08080a",
        padding: "100px 80px",
        borderBottom: "1px solid #2a2a32",
      }}
    >
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transition: "all 0.7s ease",
          }}
        >
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 64,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 800,
              lineHeight: 1.1,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            <GlitchHeading text="Контакты" />
          </p>
        </div>
        <div className="contacts-grid" style={{ display: "flex", gap: 48 }}>
          <div style={{ flex: 1 }}>
            <p
              style={{
                color: "#9a9aa4",
                fontSize: 12,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.72px",
                marginBottom: 16,
              }}
            >
              Документы премии
            </p>
            <div style={{ borderTop: "1px solid #2a2a32" }}>
              {docs.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 0",
                    borderBottom: "1px solid #2a2a32",
                  }}
                >
                  <p
                    style={{
                      color: "#f2f0ec",
                      fontSize: 17,
                      fontFamily: "var(--font-onest), sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {d}
                  </p>
                  <p
                    style={{
                      color: "#9a9aa4",
                      fontSize: 11,
                      fontFamily: "var(--font-onest), sans-serif",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.72px",
                    }}
                  >
                    PDF · скоро
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <p
              style={{
                color: "#9a9aa4",
                fontSize: 12,
                fontFamily: "var(--font-onest), sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.72px",
              }}
            >
              Связаться с оргкомитетом
            </p>
            <div>
              <p
                style={{
                  color: "#9a9aa4",
                  fontSize: 11,
                  fontFamily: "var(--font-onest), sans-serif",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.72px",
                  marginBottom: 4,
                }}
              >
                Email
              </p>
              <p
                style={{
                  color: "#f2f0ec",
                  fontSize: 20,
                  fontFamily: "var(--font-onest), sans-serif",
                  fontWeight: 500,
                }}
              >
                r.s.o@mail.ru | +7 (499) 261 33 45
              </p>
            </div>
            <div>
              <p
                style={{
                  color: "#9a9aa4",
                  fontSize: 11,
                  fontFamily: "var(--font-onest), sans-serif",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.72px",
                  marginBottom: 8,
                }}
              >
                Соцсети
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { s: "VK", href: "https://vk.ru/rso_official" },
                  { s: "MAX", href: "https://max.ru/rso_official" },
                ].map(({ s, href }) => (
                  <a
                    key={s}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "transparent",
                      border: "1px solid #2a2a32",
                      color: "#f2f0ec",
                      fontSize: 14,
                      fontFamily: "var(--font-onest), sans-serif",
                      fontWeight: 500,
                      padding: "6px 16px",
                      borderRadius: 999,
                      cursor: "pointer",
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0804ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a32")}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  color: "#9a9aa4",
                  fontSize: 11,
                  fontFamily: "var(--font-onest), sans-serif",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.72px",
                  marginBottom: 4,
                }}
              >
                Правовое
              </p>
              <p
                style={{
                  color: "#f2f0ec",
                  fontSize: 16,
                  fontFamily: "var(--font-onest), sans-serif",
                  fontWeight: 500,
                }}
              >
                Политика конфиденциальности
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Partners ─────────────────────────────────────────────────────────────────

/**
 * Партнёры и спонсоры премии. Чтобы добавить — положи логотип (белый/светлый,
 * SVG или PNG) в public/brand/partners/ и впиши сюда { name, logo, url? }.
 */
const PARTNERS: { name: string; logo: string; url?: string }[] = [
  // { name: "Партнёр", logo: "/brand/partners/example.svg", url: "https://..." },
];

function PartnersSection() {
  if (PARTNERS.length === 0) return null;
  return (
    <section
      className="sec-pad"
      style={{ background: "#08080a", padding: "80px 80px", borderBottom: "1px solid #2a2a32" }}
    >
      <p
        style={{
          color: "#6a6a72",
          fontSize: 12,
          fontFamily: "var(--font-onest), sans-serif",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          marginBottom: 28,
        }}
      >
        Партнёры премии
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 40 }}>
        {PARTNERS.map((p) => {
          const img = (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={p.logo}
              alt={p.name}
              title={p.name}
              style={{ height: 44, width: "auto", opacity: 0.85 }}
            />
          );
          return p.url ? (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer">
              {img}
            </a>
          ) : (
            <div key={p.name}>{img}</div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Share ────────────────────────────────────────────────────────────────────

function ShareButtons() {
  const [copied, setCopied] = useState(false);
  const url = "https://премиятрудкрут.рф";
  const title = "Национальная премия «Труд крут» — Российские студенческие отряды";
  const enc = encodeURIComponent;
  const SF = "var(--font-onest), sans-serif";
  const items = [
    { name: "ВКонтакте", href: `https://vk.com/share.php?url=${enc(url)}&title=${enc(title)}`, color: "#0077FF" },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ color: "#6a6a72", fontSize: 13, fontFamily: SF, fontWeight: 600 }}>
        Поделиться премией:
      </span>
      {items.map((it) => (
        <a
          key={it.name}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#c8c8d0",
            fontSize: 13,
            fontFamily: SF,
            fontWeight: 600,
            textDecoration: "none",
            border: "1px solid #2a2a32",
            borderRadius: 999,
            padding: "7px 14px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = it.color;
            e.currentTarget.style.color = it.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#2a2a32";
            e.currentTarget.style.color = "#c8c8d0";
          }}
        >
          {it.name}
        </a>
      ))}
      <button
        onClick={copy}
        style={{
          color: copied ? "#2fbf6b" : "#c8c8d0",
          fontSize: 13,
          fontFamily: SF,
          fontWeight: 600,
          background: "transparent",
          border: `1px solid ${copied ? "#2fbf6b" : "#2a2a32"}`,
          borderRadius: 999,
          padding: "7px 14px",
          cursor: "pointer",
        }}
      >
        {copied ? "Скопировано ✓" : "Копировать ссылку"}
      </button>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "#000", borderTop: "1px solid #2a2a32" }}>
      <div
        className="footer-cols footer-pad"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "48px 48px",
        }}
      >
        <Logo size={160} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              color: "#6a6a72",
              fontSize: 11,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.72px",
            }}
          >
            Контакты
          </p>
          <p
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
            }}
          >
            r.s.o@mail.ru
          </p>
          <p
            style={{
              color: "#9a9aa4",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
            }}
          >
            Оргкомитет премии
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              color: "#6a6a72",
              fontSize: 11,
              fontFamily: "var(--font-onest), sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.72px",
            }}
          >
            Правовое
          </p>
          <a
            href="/pobediteli"
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
            }}
          >
            Зал славы
          </a>
          <a
            href="/status"
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
            }}
          >
            Проверить статус заявки
          </a>
          <a
            href="/privacy"
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
            }}
          >
            Политика конфиденциальности
          </a>
          <a
            href="/consent"
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
            }}
          >
            Согласия на обработку ПДн
          </a>
          <a
            href="/cookie"
            style={{
              color: "#f2f0ec",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
            }}
          >
            Политика cookie
          </a>
          <a
            href="/login"
            style={{
              color: "#9a9aa4",
              fontSize: 14,
              fontFamily: "var(--font-onest), sans-serif",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f2f0ec")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9a9aa4")}
          >
            Вход для жюри и организаторов →
          </a>
        </div>
      </div>
      <div
        className="footer-pad"
        style={{ padding: "20px 48px", borderTop: "1px solid #2a2a32" }}
      >
        <ShareButtons />
      </div>
      <div style={{ padding: "16px 48px", borderTop: "1px solid #2a2a32" }}>
        <p
          style={{
            color: "#6a6a72",
            fontSize: 11,
            fontFamily: "var(--font-onest), sans-serif",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.72px",
          }}
        >
          © 2026 Российские студенческие отряды · Национальная премия «Труд крут»
        </p>
      </div>
    </footer>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export type LiveStats = {
  applications: number;
  regions: number;
  nominations: number;
  regionCounts?: Record<string, number>;
  startAt?: string;
  endAt?: string;
};

export function DarkLanding({ stats }: { stats?: LiveStats }) {
  const nominationsRef = useRef<HTMLElement | null>(null);
  return (
    <MotionConfig reducedMotion="user">
      <div style={{ background: "#08080a", minHeight: "100vh" }}>
        <GlobalStyles />
        <CursorSpotlight />
        <FilmGrain />
        <Header nominationsRef={nominationsRef} />
        <main>
          <Hero
            nominationsRef={nominationsRef}
            startAt={stats?.startAt}
            endAt={stats?.endAt}
          />
          <PatternBand />
          <AboutSection stats={stats} />
          <GeographySection regionCounts={stats?.regionCounts} />
          <NominationsSection sectionRef={nominationsRef} />
          <StagesSection />
          <FaqSection />
          <PartnersSection />
          <ContactsSection />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
