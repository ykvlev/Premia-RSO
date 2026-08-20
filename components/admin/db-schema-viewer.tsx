"use client";

import { useRef, useState, useCallback, useEffect } from "react";

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

type FieldType = "id" | "string" | "enum" | "json" | "datetime" | "int" | "bool" | "relation";

interface Field { name: string; type: FieldType; isKey?: boolean; enumValues?: string[]; }
interface TableDef { name: string; fields: Field[]; description: string; }
interface Relation { from: string; fromField: string; to: string; toField: string; type: string; label: string; }

const TABLES: TableDef[] = [
  { name: "User", description: "Пользователи", fields: [
    { name: "id", type: "id", isKey: true }, { name: "fio", type: "string" }, { name: "email", type: "string" },
    { name: "phone", type: "string" }, { name: "gender", type: "string" }, { name: "passwordHash", type: "string" },
    { name: "role", type: "enum", enumValues: ["participant", "jury", "admin", "superadmin"] },
    { name: "permissions", type: "json" }, { name: "createdAt", type: "datetime" },
  ]},
  { name: "Season", description: "Сезоны", fields: [
    { name: "id", type: "id", isKey: true }, { name: "year", type: "int" }, { name: "startAt", type: "datetime" },
    { name: "endAt", type: "datetime" }, { name: "isActive", type: "bool" }, { name: "scoringConfig", type: "json" },
  ]},
  { name: "Nomination", description: "Номинации", fields: [
    { name: "id", type: "id", isKey: true }, { name: "title", type: "string" }, { name: "description", type: "string" },
    { name: "criteria", type: "json" }, { name: "participantType", type: "string" }, { name: "formSchema", type: "json" },
  ]},
  { name: "Application", description: "Заявки", fields: [
    { name: "id", type: "id", isKey: true }, { name: "orgName", type: "string" }, { name: "inn", type: "string" },
    { name: "region", type: "string" }, { name: "contactFio", type: "string" }, { name: "phone", type: "string" },
    { name: "email", type: "string" }, { name: "payload", type: "json" },
    { name: "status", type: "enum", enumValues: ["new", "queued", "review", "revision", "scoring", "finalist", "winner", "rejected"] },
    { name: "createdAt", type: "datetime" },
  ]},
  { name: "Evaluation", description: "Оценки жюри", fields: [
    { name: "id", type: "id", isKey: true }, { name: "scores", type: "json" },
    { name: "comment", type: "string" }, { name: "createdAt", type: "datetime" },
  ]},
  { name: "Attachment", description: "Файлы", fields: [
    { name: "id", type: "id", isKey: true }, { name: "filename", type: "string" },
    { name: "url", type: "string" }, { name: "size", type: "int" }, { name: "mime", type: "string" },
  ]},
  { name: "LoginEvent", description: "Входы", fields: [
    { name: "id", type: "id", isKey: true }, { name: "email", type: "string" }, { name: "success", type: "bool" },
    { name: "reason", type: "string" }, { name: "ip", type: "string" }, { name: "userAgent", type: "string" },
    { name: "createdAt", type: "datetime" },
  ]},
  { name: "ApplicationEvent", description: "Аудит заявок", fields: [
    { name: "id", type: "id", isKey: true }, { name: "actor", type: "string" },
    { name: "action", type: "string" }, { name: "createdAt", type: "datetime" },
  ]},
  { name: "AdminAuditLog", description: "Аудит админов", fields: [
    { name: "id", type: "id", isKey: true }, { name: "actor", type: "string" }, { name: "action", type: "string" },
    { name: "target", type: "string" }, { name: "detail", type: "json" }, { name: "createdAt", type: "datetime" },
  ]},
  { name: "PasswordReset", description: "Сброс пароля", fields: [
    { name: "id", type: "id", isKey: true }, { name: "email", type: "string" }, { name: "code", type: "string" },
    { name: "expiresAt", type: "datetime" }, { name: "used", type: "bool" },
  ]},
  { name: "JuryAssignment", description: "Назначения жюри", fields: [
    { name: "id", type: "id", isKey: true },
  ]},
  { name: "JuryRecusal", description: "Самоотводы", fields: [
    { name: "id", type: "id", isKey: true }, { name: "createdAt", type: "datetime" },
  ]},
  { name: "Notification", description: "Уведомления", fields: [
    { name: "id", type: "id", isKey: true }, { name: "title", type: "string" }, { name: "body", type: "string" },
    { name: "type", type: "enum", enumValues: ["info", "warning", "success", "system"] },
    { name: "read", type: "bool" }, { name: "createdAt", type: "datetime" },
  ]},
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

interface DataFlow { id: string; name: string; description: string; steps: string[]; color: string; icon: string; }

const FLOWS: DataFlow[] = [
  { id: "registration", name: "Регистрация", description: "Пользователь создаёт аккаунт: вводит данные → User → письмо", steps: ["LoginEvent", "User", "PasswordReset"], color: C.green, icon: "👤" },
  { id: "login", name: "Вход в систему", description: "Email/пароль → проверка → LoginEvent → сессия", steps: ["User", "LoginEvent"], color: C.cyan, icon: "🔑" },
  { id: "application", name: "Подача заявки", description: "Форма → Application + Attachment → ApplicationEvent", steps: ["User", "Application", "Attachment", "ApplicationEvent"], color: C.accent, icon: "📝" },
  { id: "evaluation", name: "Оценка жюри", description: "JuryAssignment → оценка → Evaluation → Application", steps: ["JuryAssignment", "User", "Evaluation", "Application"], color: C.purple, icon: "⚖️" },
  { id: "admin_action", name: "Действия админа", description: "Управление → AdminAuditLog", steps: ["User", "AdminAuditLog"], color: C.red, icon: "🛡️" },
  { id: "notification", name: "Уведомления", description: "Рассылка → Notification → кабинет", steps: ["User", "Notification"], color: C.amber, icon: "🔔" },
];

// Positions: 4 columns
const TABLE_W = 185;
const FIELD_H = 20;
const HEADER_H = 36;
const PAD = 14;
const COLS = 4;
const GAP_X = 90;
const GAP_Y = 50;

const TABLE_COUNTS: Record<string, number> = {};

function calcPositions() {
  const startX = 50;
  const startY = 50;
  const pos: Record<string, { x: number; y: number; w: number; h: number }> = {};
  TABLES.forEach((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const h = HEADER_H + t.fields.length * FIELD_H + PAD;
    pos[t.name] = { x: startX + col * (TABLE_W + GAP_X), y: startY + row * (240 + GAP_Y), w: TABLE_W, h };
  });
  return pos;
}

const POSITIONS = calcPositions();

// ─── Animated Particles ─────────────────────────────────────────────────────
function FlowParticles({ pathData, color, active }: { pathData: string; color: string; active: boolean }) {
  if (!active) return null;
  return (
    <g>
      {[0, 0.25, 0.5, 0.75].map((offset) => (
        <circle key={offset} r={4} fill={color} opacity={0.9}>
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            begin={`${offset * 3}s`}
            path={pathData}
          />
          <animate
            attributeName="r"
            values="3;5;3"
            dur="3s"
            repeatCount="indefinite"
            begin={`${offset * 3}s`}
          />
          <animate
            attributeName="opacity"
            values="0.9;0.4;0.9"
            dur="3s"
            repeatCount="indefinite"
            begin={`${offset * 3}s`}
          />
        </circle>
      ))}
    </g>
  );
}

// ─── Glow filter definitions ────────────────────────────────────────────────
function GlowDefs() {
  return (
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0d0d14" strokeWidth="0.5" />
      </pattern>
      <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#0804ff" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#2fbf6b" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#8a5cf6" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#ff6b6b" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#f5a623" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feFlood floodColor="#56d4e0" floodOpacity="0.35" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}

// ─── Table Card (enhanced) ──────────────────────────────────────────────────
function TableCard({
  table, pos, highlight, onDragStart, highlightedFields, flowColor, rowCounts,
}: {
  table: TableDef;
  pos: { x: number; y: number; w: number; h: number };
  highlight: boolean;
  onDragStart: (e: React.MouseEvent, name: string) => void;
  highlightedFields?: string[];
  flowColor?: string;
  rowCounts?: Record<string, number>;
}) {
  const TYPE_COLOR: Record<FieldType, string> = {
    id: C.amber, string: "#7a7a84", enum: C.purple, json: C.cyan,
    datetime: "#555560", int: C.green, bool: C.green, relation: C.accent,
  };
  const glowFilter = highlight && flowColor ? `url(#glow-${flowColor === C.green ? "green" : flowColor === C.purple ? "purple" : flowColor === C.red ? "red" : flowColor === C.amber ? "amber" : flowColor === C.cyan ? "cyan" : "blue"})` : "url(#shadow)";

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} onMouseDown={(e) => onDragStart(e, table.name)} style={{ cursor: "grab" }}>
      {/* Shadow/glow layer */}
      <rect
        width={pos.w} height={pos.h} rx={12}
        fill="none"
        filter={glowFilter}
        opacity={highlight ? 0.8 : 0.3}
        style={{ transition: "opacity 0.4s" }}
      />
      {/* Card body */}
      <rect
        width={pos.w} height={pos.h} rx={12}
        fill={highlight ? "#0c1018" : C.card}
        stroke={highlight ? (flowColor || C.accent) : C.border}
        strokeWidth={highlight ? 1.5 : 0.5}
        style={{ transition: "all 0.4s" }}
      />
      {/* Animated border glow when highlighted */}
      {highlight && (
        <rect
          width={pos.w} height={pos.h} rx={12}
          fill="none"
          stroke={flowColor || C.accent}
          strokeWidth={2}
          opacity={0.3}
        >
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
      {/* Header bg */}
      <rect width={pos.w} height={HEADER_H} rx={12} fill={highlight ? (flowColor || C.accent) + "18" : "#15151a"} />
      <rect x={0} y={HEADER_H - 12} width={pos.w} height={12} fill={highlight ? (flowColor || C.accent) + "18" : "#15151a"} />
      {/* Header divider */}
      <line x1={0} y1={HEADER_H} x2={pos.w} y2={HEADER_H} stroke={highlight ? (flowColor || C.accent) + "33" : C.border} strokeWidth={0.5} />
      {/* Table name */}
      <text x={14} y={24} fill={highlight ? (flowColor || C.accent) : C.text} fontSize={14} fontFamily={F} fontWeight={800} letterSpacing="0.3px">
        {table.name}
      </text>
      {/* Row count badge */}
      {rowCounts?.[table.name] !== undefined && (
        <g>
          <rect x={pos.w - 42} y={10} width={32} height={18} rx={9} fill={highlight ? (flowColor || C.accent) + "22" : C.card2} stroke={highlight ? (flowColor || C.accent) + "44" : C.border} strokeWidth={0.5} />
          <text x={pos.w - 26} y={22} fill={highlight ? (flowColor || C.accent) : C.muted} fontSize={10} fontFamily={MONO} fontWeight={600} textAnchor="middle">
            {rowCounts[table.name]?.toLocaleString() ?? "—"}
          </text>
        </g>
      )}
      {/* Description tooltip */}
      <text x={14} y={24} fill="transparent" fontSize={10} fontFamily={F}>
        {table.description}
      </text>
      {/* Fields */}
      {table.fields.map((f, i) => {
        const fy = HEADER_H + 4 + i * FIELD_H + 13;
        const isHL = highlightedFields?.includes(f.name);
        return (
          <g key={f.name}>
            {isHL && (
              <rect x={3} y={HEADER_H + 2 + i * FIELD_H} width={pos.w - 6} height={FIELD_H} rx={4} fill={(flowColor || C.accent) + "12"}>
                <animate attributeName="fill" values={`${flowColor || C.accent}08;${flowColor || C.accent}18;${flowColor || C.accent}08`} dur="1.5s" repeatCount="indefinite" />
              </rect>
            )}
            {/* Type icon dot */}
            <circle cx={18} cy={fy - 3.5} r={2.5} fill={TYPE_COLOR[f.type]} opacity={isHL ? 1 : 0.4} />
            <text x={26} y={fy} fill={f.isKey ? C.amber : isHL ? C.text : "#6a6a74"} fontSize={11} fontFamily={MONO} fontWeight={f.isKey ? 700 : 400}>
              {f.name}
            </text>
            <text x={pos.w - 10} y={fy} fill={TYPE_COLOR[f.type]} fontSize={10} fontFamily={MONO} textAnchor="end" opacity={isHL ? 1 : 0.6}>
              {f.enumValues ? f.enumValues[0] + "…" : f.type}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ─── Relation Line (enhanced) ───────────────────────────────────────────────
function RelationLine({ rel, fromPos, toPos, highlight, flowColor, animKey }: {
  rel: Relation; fromPos: { x: number; y: number; w: number; h: number };
  toPos: { x: number; y: number; w: number; h: number };
  highlight: boolean; flowColor?: string; animKey: string;
}) {
  const fx = fromPos.x + fromPos.w / 2;
  const fy = fromPos.y + fromPos.h / 2;
  const tx = toPos.x + toPos.w / 2;
  const ty = toPos.y + toPos.h / 2;
  const angle = Math.atan2(ty - fy, tx - fx);
  const startX = fx + Math.cos(angle) * (fromPos.w / 2 + 6);
  const startY = fy + Math.sin(angle) * (fromPos.h / 2 + 6);
  const endX = tx - Math.cos(angle) * (toPos.w / 2 + 6);
  const endY = ty - Math.sin(angle) * (toPos.h / 2 + 6);
  const cpOffset = Math.min(Math.abs(endX - startX) * 0.35, 50);
  const pathD = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const col = flowColor || C.accent;

  return (
    <g>
      {/* Glow behind line when highlighted */}
      {highlight && (
        <path d={pathD} fill="none" stroke={col} strokeWidth={6} opacity={0.15}>
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
        </path>
      )}
      {/* Main line */}
      <path
        d={pathD} fill="none"
        stroke={highlight ? col : "#1c1c26"}
        strokeWidth={highlight ? 2 : 0.8}
        strokeDasharray={highlight ? "none" : "5 4"}
        strokeLinecap="round"
        style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
      >
        {highlight && (
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
        )}
      </path>
      {/* Animated particles */}
      <FlowParticles pathData={pathD} color={col} active={highlight} />
      {/* Endpoint dot */}
      <circle cx={endX} cy={endY} r={highlight ? 3.5 : 2.5} fill={highlight ? col : "#2a2a35"} style={{ transition: "fill 0.3s" }}>
        {highlight && <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />}
      </circle>
      {/* Label on highlighted */}
      {highlight && (
        <g>
          <rect x={midX - 50} y={midY - 18} width={100} height={16} rx={8} fill="#0a0a0f" stroke={col + "44"} strokeWidth={0.5} />
          <text x={midX} y={midY - 7} fill={col} fontSize={10} fontFamily={F} fontWeight={600} textAnchor="middle">
            {rel.label}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function DatabaseSchemaViewer({ tables }: { tables?: { name: string; count: number; size: string }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [positions, setPositions] = useState({ ...POSITIONS });

  const rowCounts: Record<string, number> = {};
  tables?.forEach((t) => { rowCounts[t.name] = t.count; });

  const flowHighlight = selectedFlow ? FLOWS.find((f) => f.id === selectedFlow) : null;

  const isTableHighlighted = (name: string) => {
    if (flowHighlight) return flowHighlight.steps.includes(name);
    if (hoveredTable) return hoveredTable === name;
    return false;
  };

  const getHighlightedFields = (tableName: string): string[] => {
    if (!flowHighlight) return [];
    const fields: string[] = [];
    RELATIONS.forEach((r) => {
      if (r.from === tableName && flowHighlight.steps.includes(r.to)) fields.push(r.fromField);
      if (r.to === tableName && flowHighlight.steps.includes(r.from)) fields.push(r.toField);
    });
    return fields;
  };

  const isRelationHighlighted = (rel: Relation) => {
    if (!flowHighlight) return false;
    const fi = flowHighlight.steps.indexOf(rel.from);
    const ti = flowHighlight.steps.indexOf(rel.to);
    return fi !== -1 && ti !== -1 && Math.abs(fi - ti) === 1;
  };

  const handleDragStart = useCallback((e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    setDragging(name);
    setDragOffset({ x: svgP.x - offset.x - positions[name].x, y: svgP.y - offset.y - positions[name].y });
  }, [offset, positions]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      setPositions((prev) => ({
        ...prev,
        [dragging]: { ...prev[dragging], x: svgP.x - offset.x - dragOffset.x, y: svgP.y - offset.y - dragOffset.y },
      }));
    } else if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [dragging, isPanning, offset, dragOffset, panStart]);

  const handleMouseUp = useCallback(() => { setDragging(null); setIsPanning(false); }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.25, Math.min(2.5, z + (e.deltaY > 0 ? -0.06 : 0.06))));
  };

  const allPos = Object.values(positions);
  const canvasW = Math.max(...allPos.map((p) => p.x + p.w)) + 120;
  const canvasH = Math.max(...allPos.map((p) => p.y + p.h)) + 120;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Flow buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FLOWS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFlow(selectedFlow === f.id ? null : f.id)}
            style={{
              background: selectedFlow === f.id ? f.color + "1a" : C.card2,
              color: selectedFlow === f.id ? f.color : C.muted,
              border: `1px solid ${selectedFlow === f.id ? f.color + "44" : C.border}`,
              borderRadius: 10, padding: "7px 14px", fontSize: 12.5, fontFamily: F, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.25s",
              boxShadow: selectedFlow === f.id ? `0 0 12px ${f.color}22` : "none",
            }}
          >
            <span style={{ fontSize: 15 }}>{f.icon}</span>
            {f.name}
          </button>
        ))}
        {selectedFlow && (
          <button
            onClick={() => setSelectedFlow(null)}
            style={{ background: C.card2, color: C.dim, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 14px", fontSize: 12, fontFamily: F, fontWeight: 600, cursor: "pointer" }}
          >
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Flow description */}
      {flowHighlight && (
        <div style={{
          background: `linear-gradient(135deg, ${flowHighlight.color}08, ${flowHighlight.color}04)`,
          border: `1px solid ${flowHighlight.color}33`,
          borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: `0 0 20px ${flowHighlight.color}0a`,
        }}>
          <span style={{ fontSize: 28 }}>{flowHighlight.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: flowHighlight.color, fontSize: 15, fontFamily: F, fontWeight: 800, margin: 0, letterSpacing: "0.2px" }}>
              {flowHighlight.name}
            </p>
            <p style={{ color: C.muted, fontSize: 12.5, fontFamily: F, margin: "4px 0 0" }}>
              {flowHighlight.description}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {flowHighlight.steps.map((s, i) => (
                <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && (
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <svg width="20" height="10" viewBox="0 0 20 10">
                        <line x1="0" y1="5" x2="14" y2="5" stroke={flowHighlight.color} strokeWidth="1.5" strokeDasharray="3 2">
                          <animate attributeName="stroke-dashoffset" values="0;-5" dur="0.8s" repeatCount="indefinite" />
                        </line>
                        <polygon points="14,2 20,5 14,8" fill={flowHighlight.color} />
                      </svg>
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontFamily: MONO, fontWeight: 600,
                    background: flowHighlight.color + "15", color: flowHighlight.color,
                    border: `1px solid ${flowHighlight.color}33`, borderRadius: 6, padding: "2px 8px",
                  }}>
                    {s}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{
        background: "linear-gradient(180deg, #06060a 0%, #0a0a10 100%)",
        border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", position: "relative",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)",
      }}>
        {/* Controls */}
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 5, display: "flex", gap: 4, backdropFilter: "blur(8px)", borderRadius: 8, background: "rgba(14,14,18,0.8)", border: `1px solid ${C.border}`, padding: 3 }}>
          {[{ l: "+", fn: () => setZoom((z) => Math.min(2.5, z + 0.12)) }, { l: "−", fn: () => setZoom((z) => Math.max(0.25, z - 0.12)) }].map((b) => (
            <button key={b.l} onClick={b.fn} style={{ width: 30, height: 30, background: "transparent", border: "none", borderRadius: 6, color: C.text, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {b.l}
            </button>
          ))}
          <div style={{ width: 1, background: C.border, margin: "4px 2px" }} />
          <button onClick={() => { setZoom(0.8); setOffset({ x: 0, y: 0 }); }} style={{ height: 30, background: "transparent", border: "none", borderRadius: 6, color: C.dim, fontSize: 10, fontFamily: F, cursor: "pointer", padding: "0 10px" }}>
            FIT
          </button>
        </div>

        <svg
          ref={svgRef} width="100%" height={520}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
        >
          <GlowDefs />
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            <rect width={canvasW} height={canvasH} fill="url(#grid)" />

            {/* Relations */}
            {RELATIONS.map((rel, i) => {
              const fromPos = positions[rel.from];
              const toPos = positions[rel.to];
              if (!fromPos || !toPos) return null;
              return (
                <RelationLine
                  key={i} rel={rel} fromPos={fromPos} toPos={toPos}
                  highlight={isRelationHighlighted(rel)}
                  flowColor={flowHighlight?.color}
                  animKey={`${rel.from}-${rel.to}-${selectedFlow ?? "none"}`}
                />
              );
            })}

            {/* Tables */}
            {TABLES.map((t) => {
              const pos = positions[t.name];
              return (
                <g key={t.name} onMouseEnter={() => setHoveredTable(t.name)} onMouseLeave={() => setHoveredTable(null)}>
                  <TableCard
                    table={t} pos={pos}
                    highlight={isTableHighlighted(t.name)}
                    onDragStart={handleDragStart}
                    highlightedFields={getHighlightedFields(t.name)}
                    flowColor={flowHighlight?.color}
                    rowCounts={rowCounts}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: F, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Типы</span>
        {[
          { label: "id", color: C.amber }, { label: "string", color: "#7a7a84" },
          { label: "enum", color: C.purple }, { label: "json", color: C.cyan },
          { label: "datetime", color: "#555560" }, { label: "int/bool", color: C.green },
        ].map((t) => (
          <span key={t.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: MONO }}>
            <span style={{ width: 7, height: 7, borderRadius: 3, background: t.color }} />
            <span style={{ color: t.color }}>{t.label}</span>
          </span>
        ))}
        <span style={{ margin: "0 4px", color: "#1a1a22" }}>│</span>
        <span style={{ fontSize: 10, color: C.dim, fontFamily: F }}>
          Перетаскивайте · Зум · Панорама
        </span>
      </div>

      {/* DB table sizes */}
      {tables && tables.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        }}>
          <p style={{ color: C.dim, fontSize: 11, fontFamily: F, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>
            Размер таблиц · {tables.length} таблиц
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tables.sort((a, b) => b.count - a.count).map((t) => {
              const maxCount = Math.max(...tables.map((x) => x.count));
              const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
              return (
                <div key={t.name} style={{
                  fontSize: 11, fontFamily: MONO, color: C.muted, background: C.card2,
                  border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px",
                  display: "flex", alignItems: "center", gap: 8, minWidth: 140,
                }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <div style={{ width: 40, height: 4, background: "#1a1a22", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: C.accent, borderRadius: 999, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ color: C.accent, fontWeight: 600, fontSize: 10, minWidth: 32, textAlign: "right" }}>{t.count.toLocaleString()}</span>
                  <span style={{ color: C.dim, fontSize: 10 }}>{t.size}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
