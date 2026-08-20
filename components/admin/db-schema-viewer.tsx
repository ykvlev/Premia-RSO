"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const C = {
  bg: "#08080a",
  card: "#0e0e12",
  card2: "#121216",
  border: "#22222a",
  text: "#f2f0ec",
  muted: "#9a9aa4",
  dim: "#6a6a72",
  accent: "#0804ff",
  green: "#2fbf6b",
  red: "#ff6b6b",
  amber: "#f5a623",
  purple: "#8a5cf6",
  cyan: "#56d4e0",
};

// ─── Схема БД: таблицы, поля, связи ────────────────────────────────────────
type FieldType = "id" | "string" | "enum" | "json" | "datetime" | "int" | "bool" | "relation";

interface Field {
  name: string;
  type: FieldType;
  relation?: string; // related model name
  isKey?: boolean;
  enumValues?: string[];
}

interface TableDef {
  name: string;
  fields: Field[];
  description: string;
}

interface Relation {
  from: string;    // table name
  fromField: string;
  to: string;      // table name
  toField: string;
  type: "one-to-many" | "many-to-one" | "many-to-many";
  label: string;
}

const TABLES: TableDef[] = [
  {
    name: "User",
    description: "Пользователи",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "fio", type: "string" },
      { name: "email", type: "string" },
      { name: "phone", type: "string" },
      { name: "gender", type: "string" },
      { name: "passwordHash", type: "string" },
      { name: "role", type: "enum", enumValues: ["participant", "jury", "admin", "superadmin"] },
      { name: "permissions", type: "json" },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "Season",
    description: "Сезоны премии",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "year", type: "int" },
      { name: "startAt", type: "datetime" },
      { name: "endAt", type: "datetime" },
      { name: "isActive", type: "bool" },
      { name: "scoringConfig", type: "json" },
    ],
  },
  {
    name: "Nomination",
    description: "Номинации премии",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "criteria", type: "json" },
      { name: "participantType", type: "string" },
      { name: "formSchema", type: "json" },
    ],
  },
  {
    name: "Application",
    description: "Заявки участников",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "orgName", type: "string" },
      { name: "inn", type: "string" },
      { name: "region", type: "string" },
      { name: "contactFio", type: "string" },
      { name: "phone", type: "string" },
      { name: "email", type: "string" },
      { name: "payload", type: "json" },
      { name: "status", type: "enum", enumValues: ["new", "queued", "review", "revision", "scoring", "finalist", "winner", "rejected"] },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "Evaluation",
    description: "Оценки жюри",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "scores", type: "json" },
      { name: "comment", type: "string" },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "Attachment",
    description: "Файлы заявок",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "filename", type: "string" },
      { name: "url", type: "string" },
      { name: "size", type: "int" },
      { name: "mime", type: "string" },
    ],
  },
  {
    name: "LoginEvent",
    description: "Журнал входов",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "email", type: "string" },
      { name: "success", type: "bool" },
      { name: "reason", type: "string" },
      { name: "ip", type: "string" },
      { name: "userAgent", type: "string" },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "ApplicationEvent",
    description: "Аудит-лог заявок",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "actor", type: "string" },
      { name: "action", type: "string" },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "AdminAuditLog",
    description: "Действия админов",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "actor", type: "string" },
      { name: "action", type: "string" },
      { name: "target", type: "string" },
      { name: "detail", type: "json" },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "PasswordReset",
    description: "Сброс пароля",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "email", type: "string" },
      { name: "code", type: "string" },
      { name: "expiresAt", type: "datetime" },
      { name: "used", type: "bool" },
    ],
  },
  {
    name: "JuryAssignment",
    description: "Назначение жюри",
    fields: [
      { name: "id", type: "id", isKey: true },
    ],
  },
  {
    name: "JuryRecusal",
    description: "Самоотводы жюри",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "createdAt", type: "datetime" },
    ],
  },
  {
    name: "Notification",
    description: "Уведомления",
    fields: [
      { name: "id", type: "id", isKey: true },
      { name: "title", type: "string" },
      { name: "body", type: "string" },
      { name: "type", type: "enum", enumValues: ["info", "warning", "success", "system"] },
      { name: "read", type: "bool" },
      { name: "createdAt", type: "datetime" },
    ],
  },
];

const RELATIONS: Relation[] = [
  { from: "Nomination", fromField: "seasonId", to: "Season", toField: "id", type: "many-to-one", label: "принадлежит сезону" },
  { from: "Application", fromField: "nominationId", to: "Nomination", toField: "id", type: "many-to-one", label: "в номинации" },
  { from: "Application", fromField: "userId", to: "User", toField: "id", type: "many-to-one", label: "от участника" },
  { from: "Evaluation", fromField: "applicationId", to: "Application", toField: "id", type: "many-to-one", label: "по заявке" },
  { from: "Evaluation", fromField: "juryUserId", to: "User", toField: "id", type: "many-to-one", label: "от жюри" },
  { from: "Attachment", fromField: "applicationId", to: "Application", toField: "id", type: "many-to-one", label: "файл заявки" },
  { from: "ApplicationEvent", fromField: "applicationId", to: "Application", toField: "id", type: "many-to-one", label: "событие" },
  { from: "JuryAssignment", fromField: "juryUserId", to: "User", toField: "id", type: "many-to-one", label: "жюри" },
  { from: "JuryAssignment", fromField: "nominationId", to: "Nomination", toField: "id", type: "many-to-one", label: "к номинации" },
  { from: "JuryRecusal", fromField: "juryUserId", to: "User", toField: "id", type: "many-to-one", label: "жюри" },
  { from: "JuryRecusal", fromField: "applicationId", to: "Application", toField: "id", type: "many-to-one", label: "по заявке" },
  { from: "Notification", fromField: "userId", to: "User", toField: "id", type: "many-to-one", label: "для пользователя" },
];

// ─── Потоки данных ──────────────────────────────────────────────────────────
interface DataFlow {
  id: string;
  name: string;
  description: string;
  steps: string[]; // table names in order
  color: string;
  icon: string;
}

const FLOWS: DataFlow[] = [
  {
    id: "registration",
    name: "Регистрация",
    description: "Пользователь создаёт аккаунт: вводит данные → сохраняется User → отправляется письмо",
    steps: ["LoginEvent", "User", "PasswordReset"],
    color: C.green,
    icon: "👤",
  },
  {
    id: "login",
    name: "Вход в систему",
    description: "Пользователь вводит email/пароль → проверка → запись в LoginEvent → сессия",
    steps: ["User", "LoginEvent"],
    color: C.cyan,
    icon: "🔑",
  },
  {
    id: "application",
    name: "Подача заявки",
    description: "Участник заполняет форму → Application + Attachment → ApplicationEvent",
    steps: ["User", "Application", "Attachment", "ApplicationEvent"],
    color: C.accent,
    icon: "📝",
  },
  {
    id: "evaluation",
    name: "Оценка жюри",
    description: "Жюри получает назначение → оценивает → Evaluation → обновление статуса",
    steps: ["JuryAssignment", "User", "Evaluation", "Application"],
    color: C.purple,
    icon: "⚖️",
  },
  {
    id: "admin_action",
    name: "Действия админа",
    description: "Суперадмин управляет сайтом → AdminAuditLog",
    steps: ["User", "AdminAuditLog"],
    color: C.red,
    icon: "🛡️",
  },
  {
    id: "notification",
    name: "Уведомления",
    description: "Рассылка уведомлений → Notification → пользователь видит в кабинете",
    steps: ["User", "Notification"],
    color: C.amber,
    icon: "🔔",
  },
];

// ─── Позиции таблиц на холсте ──────────────────────────────────────────────
const TABLE_W = 180;
const FIELD_H = 20;
const HEADER_H = 32;
const PAD = 12;

// Предрасчёт позиций: сетка 4 колонки
function calcPositions() {
  const COLS = 4;
  const GAP_X = 80;
  const GAP_Y = 40;
  const startX = 40;
  const startY = 40;
  const pos: Record<string, { x: number; y: number; w: number; h: number }> = {};

  TABLES.forEach((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const h = HEADER_H + t.fields.length * FIELD_H + PAD;
    pos[t.name] = {
      x: startX + col * (TABLE_W + GAP_X),
      y: startY + row * (220 + GAP_Y),
      w: TABLE_W,
      h,
    };
  });
  return pos;
}

const POSITIONS = calcPositions();

// ─── Компонент таблицы ──────────────────────────────────────────────────────
function TableCard({
  table,
  pos,
  highlight,
  onDragStart,
  highlightedFields,
}: {
  table: TableDef;
  pos: { x: number; y: number; w: number; h: number };
  highlight: boolean;
  onDragStart: (e: React.MouseEvent, name: string) => void;
  highlightedFields?: string[];
}) {
  const TYPE_COLOR: Record<FieldType, string> = {
    id: C.amber,
    string: C.muted,
    enum: C.purple,
    json: C.cyan,
    datetime: C.dim,
    int: C.green,
    bool: C.green,
    relation: C.accent,
  };

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onMouseDown={(e) => onDragStart(e, table.name)}
      style={{ cursor: "grab" }}
    >
      {/* Фон */}
      <rect
        width={pos.w}
        height={pos.h}
        rx={10}
        fill={highlight ? "#0e1218" : C.card}
        stroke={highlight ? C.accent : C.border}
        strokeWidth={highlight ? 2 : 1}
        style={{ transition: "stroke 0.3s, fill 0.3s" }}
      />
      {/* Заголовок */}
      <rect width={pos.w} height={HEADER_H} rx={10} fill={highlight ? C.accent + "22" : C.card2} />
      <rect x={pos.w - 10} width={10} height={HEADER_H} fill={highlight ? C.accent + "22" : C.card2} />
      <text
        x={12}
        y={21}
        fill={highlight ? C.accent : C.text}
        fontSize={13}
        fontFamily={F}
        fontWeight={700}
      >
        {table.name}
      </text>
      <text
        x={pos.w - 10}
        y={21}
        fill={C.dim}
        fontSize={10}
        fontFamily={F}
        textAnchor="end"
      >
        {table.fields.length}
      </text>
      {/* Поля */}
      {table.fields.map((f, i) => {
        const fy = HEADER_H + i * FIELD_H + 14;
        const isHL = highlightedFields?.includes(f.name);
        return (
          <g key={f.name}>
            {isHL && (
              <rect
                x={2}
                y={HEADER_H + i * FIELD_H}
                width={pos.w - 4}
                height={FIELD_H}
                rx={4}
                fill={C.accent + "15"}
              />
            )}
            <text
              x={12}
              y={fy}
              fill={f.isKey ? C.amber : isHL ? C.text : C.muted}
              fontSize={11}
              fontFamily={MONO}
              fontWeight={f.isKey ? 700 : 400}
            >
              {f.isKey ? "🔑 " : ""}
              {f.name}
            </text>
            <text
              x={pos.w - 10}
              y={fy}
              fill={TYPE_COLOR[f.type]}
              fontSize={10}
              fontFamily={MONO}
              textAnchor="end"
            >
              {f.enumValues ? f.enumValues[0] + "…" : f.type}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Компонент линии связи ──────────────────────────────────────────────────
function RelationLine({
  rel,
  fromPos,
  toPos,
  highlight,
}: {
  rel: Relation;
  fromPos: { x: number; y: number; w: number; h: number };
  toPos: { x: number; y: number; w: number; h: number };
  highlight: boolean;
}) {
  // Соединяем центры таблиц
  const fx = fromPos.x + fromPos.w / 2;
  const fy = fromPos.y + fromPos.h / 2;
  const tx = toPos.x + toPos.w / 2;
  const ty = toPos.y + toPos.h / 2;

  // Вычисляем точки на краях прямоугольников
  const angle = Math.atan2(ty - fy, tx - fx);
  const startX = fx + Math.cos(angle) * (fromPos.w / 2 + 5);
  const startY = fy + Math.sin(angle) * (fromPos.h / 2 + 5);
  const endX = tx - Math.cos(angle) * (toPos.w / 2 + 5);
  const endY = ty - Math.sin(angle) * (toPos.h / 2 + 5);

  // S-образная кривая
  const midX = (startX + endX) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const cpOffset = Math.min(Math.abs(dx) * 0.4, 60);

  const path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={highlight ? C.accent : "#2a2a35"}
        strokeWidth={highlight ? 2 : 1}
        strokeDasharray={highlight ? "none" : "4 3"}
        style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
      />
      {/* Стрелка */}
      <circle cx={endX} cy={endY} r={highlight ? 4 : 3} fill={highlight ? C.accent : "#3a3a45"} />
      {/* Label */}
      {highlight && (
        <text
          x={midX}
          y={midY(startY, endY) - 6}
          fill={C.accent}
          fontSize={10}
          fontFamily={F}
          fontWeight={600}
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {rel.label}
        </text>
      )}
    </g>
  );
}

function midY(a: number, b: number) {
  return (a + b) / 2;
}

// ─── Главный компонент ERD ──────────────────────────────────────────────────
export function DatabaseSchemaViewer({ tables }: { tables?: { name: string; count: number; size: string }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Вычисляем подсветку для текущего потока
  const flowHighlight = selectedFlow
    ? FLOWS.find((f) => f.id === selectedFlow)
    : null;

  const isTableHighlighted = (name: string) => {
    if (flowHighlight) return flowHighlight.steps.includes(name);
    if (hoveredTable) return hoveredTable === name;
    return false;
  };

  const getHighlightedFields = (tableName: string): string[] => {
    if (!flowHighlight) return [];
    const idx = flowHighlight.steps.indexOf(tableName);
    if (idx === -1) return [];
    // Подсвечиваем relation-поля
    const fields: string[] = [];
    RELATIONS.forEach((r) => {
      if (r.from === tableName && flowHighlight.steps.includes(r.to)) {
        fields.push(r.fromField);
      }
      if (r.to === tableName && flowHighlight.steps.includes(r.from)) {
        fields.push(r.toField);
      }
    });
    return fields;
  };

  const isRelationHighlighted = (rel: Relation) => {
    if (!flowHighlight) return false;
    const fromIdx = flowHighlight.steps.indexOf(rel.from);
    const toIdx = flowHighlight.steps.indexOf(rel.to);
    return fromIdx !== -1 && toIdx !== -1 && Math.abs(fromIdx - toIdx) === 1;
  };

  // Drag table
  const handleDragStart = useCallback(
    (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const pos = POSITIONS[name];
      setDragging(name);
      setDragOffset({ x: svgP.x - offset.x - pos.x, y: svgP.y - offset.y - pos.y });
    },
    [offset],
  );

  // Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === "rect" && !(e.target as SVGElement).closest("g")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) {
        const svg = svgRef.current;
        if (!svg) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
        POSITIONS[dragging].x = svgP.x - offset.x - dragOffset.x;
        POSITIONS[dragging].y = svgP.y - offset.y - dragOffset.y;
      } else if (isPanning) {
        setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    },
    [dragging, isPanning, offset, dragOffset, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
  }, []);

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.3, Math.min(2, z + delta)));
  };

  // Вычисляем общий размер холста
  const allPos = Object.values(POSITIONS);
  const maxX = Math.max(...allPos.map((p) => p.x + p.w));
  const maxY = Math.max(...allPos.map((p) => p.y + p.h));
  const canvasW = maxX + 100;
  const canvasH = maxY + 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Панель потоков */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FLOWS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFlow(selectedFlow === f.id ? null : f.id)}
            style={{
              background: selectedFlow === f.id ? f.color + "22" : C.card2,
              color: selectedFlow === f.id ? f.color : C.muted,
              border: `1px solid ${selectedFlow === f.id ? f.color + "55" : C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <span>{f.icon}</span>
            {f.name}
          </button>
        ))}
        {selectedFlow && (
          <button
            onClick={() => setSelectedFlow(null)}
            style={{
              background: C.card2,
              color: C.dim,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: F,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Описание потока */}
      {flowHighlight && (
        <div
          style={{
            background: flowHighlight.color + "10",
            border: `1px solid ${flowHighlight.color}44`,
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>{flowHighlight.icon}</span>
          <div>
            <p style={{ color: flowHighlight.color, fontSize: 14, fontFamily: F, fontWeight: 700, margin: 0 }}>
              {flowHighlight.name}
            </p>
            <p style={{ color: C.muted, fontSize: 12, fontFamily: F, margin: "3px 0 0" }}>
              {flowHighlight.description}
            </p>
            <p style={{ color: C.dim, fontSize: 11, fontFamily: MONO, margin: "5px 0 0" }}>
              {flowHighlight.steps.map((s, i) => (
                <span key={s}>
                  {i > 0 && <span style={{ color: flowHighlight.color, margin: "0 4px" }}>→</span>}
                  {s}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Холст */}
      <div
        style={{
          background: "#08080c",
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Зум-контролы */}
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 5, display: "flex", gap: 4 }}>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            style={{ width: 28, height: 28, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
            style={{ width: 28, height: 28, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            −
          </button>
          <button
            onClick={() => { setZoom(0.85); setOffset({ x: 0, y: 0 }); }}
            style={{ height: 28, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, fontSize: 10, fontFamily: F, cursor: "pointer", padding: "0 8px" }}
          >
            Reset
          </button>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height={500}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            {/* Сетка-фон */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#111118" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width={canvasW} height={canvasH} fill="url(#grid)" />

            {/* Линии связей */}
            {RELATIONS.map((rel, i) => {
              const fromPos = POSITIONS[rel.from];
              const toPos = POSITIONS[rel.to];
              if (!fromPos || !toPos) return null;
              const hl = isRelationHighlighted(rel);
              return (
                <RelationLine
                  key={i}
                  rel={rel}
                  fromPos={fromPos}
                  toPos={toPos}
                  highlight={hl}
                />
              );
            })}

            {/* Таблицы */}
            {TABLES.map((t) => {
              const pos = POSITIONS[t.name];
              return (
                <g
                  key={t.name}
                  onMouseEnter={() => setHoveredTable(t.name)}
                  onMouseLeave={() => setHoveredTable(null)}
                >
                  <TableCard
                    table={t}
                    pos={pos}
                    highlight={isTableHighlighted(t.name)}
                    onDragStart={handleDragStart}
                    highlightedFields={getHighlightedFields(t.name)}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Легенда */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>Типы:</span>
        {[
          { label: "id", color: C.amber },
          { label: "string", color: C.muted },
          { label: "enum", color: C.purple },
          { label: "json", color: C.cyan },
          { label: "datetime", color: C.dim },
          { label: "int/bool", color: C.green },
        ].map((t) => (
          <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: MONO }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, display: "inline-block" }} />
            <span style={{ color: t.color }}>{t.label}</span>
          </span>
        ))}
        <span style={{ margin: "0 6px", color: C.border }}>|</span>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>
          Перетаскивайте таблицы · Зум колёсиком · Панорамируйте кликом
        </span>
      </div>

      {/* Статистика таблиц из БД */}
      {tables && tables.length > 0 && (
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}>
          <p style={{ color: C.dim, fontSize: 11, fontFamily: F, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 8px" }}>
            Размер таблиц в БД
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tables.map((t) => (
              <span
                key={t.name}
                style={{
                  fontSize: 11,
                  fontFamily: MONO,
                  color: C.muted,
                  background: C.card2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  display: "flex",
                  gap: 6,
                }}
              >
                {t.name}
                <span style={{ color: C.accent }}>{t.count.toLocaleString()}</span>
                <span style={{ color: C.dim }}>{t.size}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
