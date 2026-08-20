"use client";

import { useState } from "react";
import { broadcastMail, previewBroadcastEmail } from "@/app/admin/actions";

const F = "var(--font-onest), sans-serif";

type Nom = { id: string; title: string };

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: "all", label: "Все заявители" },
  { value: "new", label: "Только новые" },
  { value: "review", label: "На рассмотрении" },
  { value: "approved", label: "Одобренные (финалисты)" },
  { value: "winner", label: "Победители" },
  { value: "rejected", label: "Отклонённые" },
];

const EMAIL_PRESETS: { id: string; icon: string; label: string; category: string; subject: string; body: string; defaultTarget: string }[] = [
  {
    id: "welcome", icon: "👋", category: "Общее",
    label: "Приветствие нового участника",
    subject: "Добро пожаловать в «Труд Крут»!",
    body: "Здравствуйте, {name}!\n\nРады приветствовать вас на Национальной премии «Труд Крут». Ваша заявка принята и находится на рассмотрении.\n\nМы уведомим вас о дальнейших этапах.\n\nС уважением,\nОргкомитет премии «Труд Крут»",
    defaultTarget: "new",
  },
  {
    id: "status_change", icon: "📋", category: "Статус заявки",
    label: "Заявка принята к рассмотрению",
    subject: "Ваша заявка на «Труд Крут» — статус обновлён",
    body: "Здравствуйте, {name}!\n\nВаша заявка переведена на этап рассмотрения. Наш оргкомитет уже изучает материалы.\n\nСледите за обновлениями в личном кабинете.\n\nС уважением,\nОргкомитет",
    defaultTarget: "review",
  },
  {
    id: "revision", icon: "✏️", category: "Статус заявки",
    label: "Запрос доработки",
    subject: "«Труд Крут» — доработка заявки",
    body: "Здравствуйте, {name}!\n\nПо результатам первичного рассмотрения вашей заявки专家组 рекомендует внести доработки. Пожалуйста, обновите материалы в личном кабинете и отправьте повторно.\n\nЕсли вопросы — пишите, мы поможем.\n\nОргкомитет «Труд Крут»",
    defaultTarget: "review",
  },
  {
    id: "finalist", icon: "🎉", category: "Статус заявки",
    label: "Поздравление финалиста",
    subject: "Поздравляем! Вы — финалист премии «Труд Крут»!",
    body: "Здравствуйте, {name}!\n\nС огромным удовольствием сообщаем, что ваша заявка прошла все этапы отбора и вышли в финал Национальной премии «Труд Крут»!\n\nМы свяжемся с вами для участия в церемонии награждения.\n\nС уважением,\nОргкомитет",
    defaultTarget: "approved",
  },
  {
    id: "winner", icon: "🏆", category: "Статус заявки",
    label: "Победитель премии",
    subject: "Вы — победитель Национальной премии «Труд Крут»!",
    body: "Здравствуйте, {name}!\n\nМы счастливы сообщить, что вы стали победителем Национальной премии «Труд Крут» в вашей номинации!\n\nПриглашаем вас на торжественную церемонию награждения. Подробности отправим отдельно.\n\nС уважением,\nОргкомитет",
    defaultTarget: "winner",
  },
  {
    id: "rejected", icon: "📬", category: "Статус заявки",
    label: "Отклонение заявки",
    subject: "Результат рассмотрения заявки «Труд Крут»",
    body: "Здравствуйте, {name}!\n\nБлагодарим за участие в Национальной премии «Труд Крут». К сожалению, на данном этапе ваша заявка не прошла отбор.\n\nМы ценим ваш вклад и будем рады видеть вас снова в следующем сезоне.\n\nС уважением,\nОргкомитет",
    defaultTarget: "rejected",
  },
  {
    id: "ceremony_invite", icon: "🎭", category: "Мероприятия",
    label: "Приглашение на церемонию",
    subject: "Приглашение на церемонию награждения «Труд Крут»",
    body: "Здравствуйте, {name}!\n\nПриглашаем вас на торжественную церемонию награждения Национальной премии «Труд Крут».\n\n📅 Дата: [указать дату]\n📍 Место: [указать место]\n🕐 Начало: [указать время]\n\nПросим подтвердить присутствие до [дата].\n\nС уважением,\nОргкомитет",
    defaultTarget: "approved",
  },
  {
    id: "deadline_reminder", icon: "⏰", category: "Напоминания",
    label: "Напоминание о дедлайне",
    subject: "«Труд Крут» — осталось мало времени!",
    body: "Здравствуйте, {name}!\n\nНапоминаем, что срок подачи заявок на Национальную премию «Труд Крут» истекает [дата].\n\nУспейте отправить свою заявку в личном кабинете.\n\nУдачи!\nОргкомитет",
    defaultTarget: "new",
  },
  {
    id: "jury_invite", icon: "⚖️", category: "Жюри",
    label: "Приглашение жюри",
    subject: "Приглашение в жюри Национальной премии «Труд Крут»",
    body: "Здравствуйте, {name}!\n\nПриглашаем вас стать членом жюри Национальной премии «Труд Крут» в сезоне [год].\n\nВаш экспертный опыт будет неоценим для оценки заявок. Ознакомьтесь с критериями в личном кабинете.\n\nБудем рады сотрудничеству!\nОргкомитет",
    defaultTarget: "all",
  },
  {
    id: "season_start", icon: "🚀", category: "Общее",
    label: "Старт нового сезона",
    subject: "Новый сезон «Труд Крут» открыт!",
    body: "Здравствуйте, {name}!\n\nМы рады объявить о старте нового сезона Национальной премии «Труд Крут»!\n\nПодавайте заявки, участвуйте в оценке и присоединяйтесь к нашему сообществу профессионалов.\n\nПодробности на сайте.\n\nОргкомитет",
    defaultTarget: "all",
  },
  {
    id: "results_published", icon: "📊", category: "Общее",
    label: "Публикация результатов",
    subject: "Результаты «Труд Крут» — [год] объявлены!",
    body: "Здравствуйте, {name}!\n\nРезультаты Национальной премии «Труд Крут» [год] подведены.\n\nПобедители и финалисты получат персональные уведомления. Полный список доступен на сайте премии.\n\nБлагодарим всех участников!\nОргкомитет",
    defaultTarget: "all",
  },
  {
    id: "profile_reminder", icon: "👤", category: "Напоминания",
    label: "Заполните профиль",
    subject: "«Труд Крут» — заполните профиль участника",
    body: "Здравствуйте, {name}!\n\nДля участия в премии «Труд Крут» необходимо заполнить профиль участника в личном кабинете.\n\nУкажите рабочие данные и информацию о себе — это поможет жюри при оценке заявки.\n\nОргкомитет",
    defaultTarget: "all",
  },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0d0d12",
  border: "1px solid #2a2a32",
  borderRadius: 8,
  color: "#f2f0ec",
  fontSize: 14,
  fontFamily: F,
  padding: "11px 13px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#9a9aa4",
  fontSize: 12,
  fontWeight: 600,
  fontFamily: F,
  marginBottom: 7,
};

export function MailingForm({ nominations }: { nominations: Nom[] }) {
  const [status, setStatus] = useState("all");
  const [nominationId, setNominationId] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; total: number; sent: number; failed: number }
    | { ok: false; error: string }
    | null
  >(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [catFilter, setCatFilter] = useState("all");

  const categories = [...new Set(EMAIL_PRESETS.map((p) => p.category))];
  const filteredPresets = catFilter === "all" ? EMAIL_PRESETS : EMAIL_PRESETS.filter((p) => p.category === catFilter);

  function applyPreset(preset: typeof EMAIL_PRESETS[0]) {
    setSubject(preset.subject);
    setBody(preset.body);
    setStatus(preset.defaultTarget);
    setShowPresets(false);
  }

  async function onPreview() {
    if (!body.trim()) {
      setResult({ ok: false, error: "Введите текст письма для предпросмотра" });
      return;
    }
    setPreviewing(true);
    try {
      const r = await previewBroadcastEmail(body);
      if (r.ok) setPreviewHtml(r.html);
      else setResult({ ok: false, error: r.error });
    } catch {
      setResult({ ok: false, error: "Не удалось построить предпросмотр" });
    } finally {
      setPreviewing(false);
    }
  }

  async function onSend() {
    if (!subject.trim() || !body.trim()) {
      setResult({ ok: false, error: "Заполните тему и текст письма" });
      return;
    }
    const recipientsLabel =
      STATUS_OPTS.find((s) => s.value === status)?.label ?? "выбранной группе";
    if (
      !window.confirm(
        `Отправить письмо «${subject.trim()}» получателям: ${recipientsLabel}?`,
      )
    ) {
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const r = await broadcastMail({ subject, body, status, nominationId });
      setResult(r);
      if (r.ok) {
        setSubject("");
        setBody("");
      }
    } catch {
      setResult({ ok: false, error: "Ошибка отправки. Попробуйте ещё раз." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* ── Email Template Presets ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: "#0d0d12", border: "1px solid #1d1d25" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showPresets ? 12 : 0 }}>
          <span style={{ color: "#f2f0ec", fontSize: 13, fontWeight: 700, fontFamily: F }}>Шаблоны писем</span>
          <button onClick={() => setShowPresets(!showPresets)} style={{ background: "transparent", border: "none", color: "#9a9aa4", fontSize: 12, cursor: "pointer", fontFamily: F }}>
            {showPresets ? "Свернуть" : "Показать"}
          </button>
        </div>
        {showPresets && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setCatFilter("all")} style={{ padding: "4px 10px", borderRadius: 5, background: catFilter === "all" ? "#0804ff20" : "transparent", border: `1px solid ${catFilter === "all" ? "#0804ff" : "#2a2a32"}`, color: catFilter === "all" ? "#c9d1ff" : "#6a6a72", fontSize: 11, cursor: "pointer", fontFamily: F }}>Все</button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "4px 10px", borderRadius: 5, background: catFilter === c ? "#0804ff20" : "transparent", border: `1px solid ${catFilter === c ? "#0804ff" : "#2a2a32"}`, color: catFilter === c ? "#c9d1ff" : "#6a6a72", fontSize: 11, cursor: "pointer", fontFamily: F }}>{c}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
              {filteredPresets.map((p) => (
                <button key={p.id} onClick={() => applyPreset(p)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, background: "#111117", border: "1px solid #1d1d25", cursor: "pointer", transition: "border-color 0.15s", fontFamily: F }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0804ff55")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1d1d25")}>
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <p style={{ color: "#f2f0ec", fontSize: 12, fontWeight: 600, margin: "6px 0 2px", lineHeight: 1.3 }}>{p.label}</p>
                  <p style={{ color: "#6a6a72", fontSize: 10, margin: 0 }}>{p.category}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelStyle}>Кому</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Номинация</label>
          <select
            value={nominationId}
            onChange={(e) => setNominationId(e.target.value)}
            style={inputStyle}
          >
            <option value="all">Все номинации</option>
            {nominations.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Тема письма</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Например: Приглашение на церемонию награждения"
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Текст письма</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          placeholder="Текст обращения к заявителям…"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
        />
        <p style={{ color: "#6a6a72", fontSize: 12, fontFamily: F, marginTop: 8 }}>
          Каждому получателю добавится приветствие по имени и подпись оргкомитета.
          Одному адресу — одно письмо, даже если заявок несколько.
        </p>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          onClick={onSend}
          disabled={sending}
          style={{
            background: sending ? "#1a1a22" : "#0804ff",
            color: sending ? "#6a6a72" : "#fff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: F,
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            cursor: sending ? "default" : "pointer",
          }}
        >
          {sending ? "Отправка…" : "Отправить рассылку"}
        </button>

        <button
          onClick={onPreview}
          disabled={previewing}
          style={{
            background: "transparent",
            color: "#c8c8d0",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: F,
            border: "1px solid #2a2a32",
            borderRadius: 8,
            padding: "12px 20px",
            cursor: previewing ? "default" : "pointer",
          }}
        >
          {previewing ? "Готовлю…" : "Предпросмотр"}
        </button>

        {result && (
          <span
            style={{
              fontSize: 13,
              fontFamily: F,
              fontWeight: 600,
              color: result.ok ? "#2fbf6b" : "#e06a6a",
            }}
          >
            {result.ok
              ? `Отправлено ${result.sent} из ${result.total}` +
                (result.failed ? ` · ошибок: ${result.failed}` : "")
              : result.error}
          </span>
        )}
      </div>

      {previewHtml && (
        <div
          onClick={() => setPreviewHtml(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 100,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflow: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 680,
              background: "#0e0e12",
              border: "1px solid #2a2a32",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid #1e1e24",
              }}
            >
              <span style={{ color: "#f2f0ec", fontSize: 14, fontWeight: 700, fontFamily: F }}>
                Предпросмотр письма
              </span>
              <button
                onClick={() => setPreviewHtml(null)}
                aria-label="Закрыть"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9a9aa4",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <iframe
              title="Предпросмотр письма"
              srcDoc={previewHtml}
              style={{
                width: "100%",
                height: "72vh",
                border: "none",
                background: "#060608",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
