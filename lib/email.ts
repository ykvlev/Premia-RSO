import { brand } from "@/lib/brand";

/**
 * Фирменные HTML-письма «Труд крут» (email-safe: таблицы + инлайн-стили).
 * Общая оболочка (шапка / кирпич / паттерн-лента / футер) + начинки:
 *  - renderBroadcastEmail — массовая рассылка;
 *  - renderStatusEmail    — смена статуса и/или комментарий эксперта (ОДНО письмо).
 */

const SITE = (process.env.NEXTAUTH_URL || "https://премиятрудкрут.рф").replace(/\/+$/, "");
// Punycode-база для картинок: надёжнее IDN в img src у части почтовых клиентов.
const ASSET = "https://xn--d1abjjhqhdcqeid5n.xn--p1ai";
const BLUE = "#0804FF";
const F = "Arial,Helvetica,sans-serif";

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Плоский текст → стилизованные абзацы (переносы строк сохраняются). */
function paragraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (l) =>
        `<p style="margin:0 0 12px; font-size:15px; line-height:1.6; color:#c8c8d0; font-family:${F};">${escapeHtml(l)}</p>`,
    )
    .join("");
}

function buttonRow(href: string, label: string): string {
  return `
    <tr><td align="center" style="padding:26px 28px 6px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${BLUE}" style="border-radius:999px;">
          <a href="${href}" target="_blank" style="display:inline-block; padding:16px 44px; font-family:${F}; font-size:16px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:999px;">${escapeHtml(label)}</a>
        </td>
      </tr></table>
    </td></tr>`;
}

function calloutRow(kicker: string, value: string, accent = BLUE): string {
  return `
    <tr><td style="padding:8px 28px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111119; border-left:3px solid ${accent}; border-radius:8px;">
        <tr><td style="padding:14px 18px; font-family:${F};">
          <div style="font-size:11px; letter-spacing:1.5px; color:#7a7a82; font-weight:bold;">${escapeHtml(kicker)}</div>
          <div style="font-size:18px; color:#f2f0ec; font-weight:bold; margin-top:4px;">${escapeHtml(value)}</div>
        </td></tr>
      </table>
    </td></tr>`;
}

function commentRow(comment: string): string {
  return `
    <tr><td style="padding:8px 28px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111119; border-radius:10px;">
        <tr><td style="padding:16px 18px; font-family:${F};">
          <div style="font-size:11px; letter-spacing:1.5px; color:#7a7a82; font-weight:bold; margin-bottom:8px;">КОММЕНТАРИЙ ЭКСПЕРТА</div>
          <div style="font-size:15px; line-height:1.6; color:#e8e8ec;">${paragraphs(comment) || escapeHtml(comment)}</div>
        </td></tr>
      </table>
    </td></tr>`;
}

/** Общая оболочка письма. contentHtml — набор <tr>…</tr> между паттерном и футером. */
function shell(opts: { preheader: string; contentHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(brand.fullName)}</title>
</head>
<body style="margin:0; padding:0; background:#060608;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#060608; font-size:1px; line-height:1px;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#060608;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px; max-width:640px; background:#0d0d11; border:1px solid #1e1e24; border-radius:18px; overflow:hidden;">

    <tr><td style="padding:18px 28px; border-bottom:1px solid #1a1a20;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="left" style="font-family:${F}; font-size:11px; letter-spacing:2px; color:#8a8a92; font-weight:bold;">РОССИЙСКИЕ&nbsp;СТУДЕНЧЕСКИЕ&nbsp;ОТРЯДЫ</td>
        <td align="right" style="font-family:${F}; font-size:11px; letter-spacing:2px; color:#5a5a62; font-weight:bold;">СЕЗОН&nbsp;2026</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:40px 28px 8px;">
      <div style="font-family:${F}; font-size:12px; letter-spacing:3px; color:${BLUE}; font-weight:bold; margin-bottom:10px;">НАЦИОНАЛЬНАЯ ПРЕМИЯ</div>
      <div style="font-family:'Arial Black',Arial,sans-serif; font-size:64px; line-height:0.92; color:#f2f0ec; font-weight:900; letter-spacing:-1px;">ТРУД<br><span style="font-style:italic;">КРУТ</span></div>
      <div style="font-family:${F}; font-size:16px; color:#b8b8c0; margin-top:18px; max-width:380px;">Ты вкладываешься — страна замечает. Подай заявку и получи заслуженное признание.</div>
    </td></tr>

    <tr><td align="center" style="padding:14px 20px 6px;">
      <img src="${ASSET}/brand/email/brick.jpg" width="600" alt="Награда «Труд крут» 2026" style="display:block; width:100%; max-width:600px; height:auto; border:0; border-radius:12px;">
    </td></tr>

    <tr><td style="padding:14px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="8" style="background:#0804FF; border-radius:2px;"></td><td width="6"></td>
        <td height="8" style="background:#FE4734;"></td><td width="6"></td>
        <td height="8" style="background:#FE9633;"></td><td width="6"></td>
        <td height="8" style="background:#4CACF7;"></td><td width="6"></td>
        <td height="8" style="background:#6DC185;"></td><td width="6"></td>
        <td height="8" style="background:#8043F9;"></td><td width="6"></td>
        <td height="8" style="background:#00DFF2;"></td>
      </tr></table>
    </td></tr>

    ${opts.contentHtml}

    <tr><td style="padding:30px 28px 0;"><div style="height:1px; background:#1a1a20;"></div></td></tr>

    <tr><td style="padding:22px 28px 30px; font-family:${F};">
      <div style="font-size:15px; color:#f2f0ec; font-weight:bold;">Труд крут</div>
      <div style="font-size:12px; color:#8a8a92; margin-top:4px; line-height:1.6;">Национальная премия в области создания условий и поддержки трудоустройства молодёжи.<br>Молодёжная общероссийская общественная организация «Российские студенческие отряды».</div>
      <div style="margin-top:14px;">
        <a href="${SITE}" style="font-size:12px; color:${BLUE}; text-decoration:none; font-weight:bold;">премиятрудкрут.рф</a>
        <span style="color:#3a3a42;"> &nbsp;·&nbsp; </span>
        <a href="https://vk.com/rso_official" style="font-size:12px; color:${BLUE}; text-decoration:none; font-weight:bold;">ВКонтакте</a>
      </div>
      <div style="font-size:11px; color:#5a5a62; margin-top:16px; line-height:1.6;">Вы получили это письмо как участник/партнёр премии «Труд крут».<br>Если письмо пришло по ошибке — просто проигнорируйте его.</div>
    </td></tr>

  </table>
  <div style="font-family:${F}; font-size:11px; color:#4a4a52; margin-top:16px;">© 2026 Российские студенческие отряды</div>
</td></tr>
</table>
</body></html>`;
}

/** Массовая рассылка: имя + текст (+ опц. дедлайн-callout). */
export function renderBroadcastEmail(o: {
  name: string;
  body: string;
  deadline?: string;
}): { html: string; text: string } {
  const greeting = `<tr><td style="padding:30px 28px 4px; font-family:${F};">
    <div style="font-size:20px; color:#f2f0ec; font-weight:bold; margin-bottom:14px;">Здравствуйте, ${escapeHtml(o.name || "участник")}!</div>
    ${paragraphs(o.body)}
  </td></tr>`;
  const content =
    greeting +
    (o.deadline ? calloutRow("ПРИЁМ ЗАЯВОК", o.deadline) : "") +
    buttonRow(`${SITE}/apply`, "Подать заявку →");
  const html = shell({ preheader: o.body.slice(0, 120), contentHtml: content });
  const text = [
    `Здравствуйте, ${o.name || "участник"}!`,
    "",
    o.body,
    "",
    o.deadline ? `Приём заявок: ${o.deadline}` : "",
    `Подать заявку: ${SITE}/apply`,
    "",
    `— Оргкомитет, ${brand.org}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
  return { html, text };
}

/** Обновление по заявке: статус и/или комментарий эксперта — в ОДНОМ письме. */
export function renderStatusEmail(o: {
  name: string;
  nominationTitle: string;
  appId: string;
  statusLabel?: string;
  statusLine?: string;
  statusColor?: string;
  comment?: string;
}): { html: string; text: string } {
  const blocks: string[] = [
    `<div style="font-size:20px; color:#f2f0ec; font-weight:bold; margin-bottom:14px;">Здравствуйте, ${escapeHtml(o.name || "участник")}!</div>`,
  ];
  if (o.statusLabel) {
    blocks.push(
      `<p style="margin:0 0 4px; font-size:15px; line-height:1.6; color:#c8c8d0;">Статус вашей заявки на номинацию «${escapeHtml(o.nominationTitle)}» обновлён.</p>`,
    );
  }
  const greeting = `<tr><td style="padding:30px 28px 4px; font-family:${F};">${blocks.join("")}</td></tr>`;

  let content = greeting;
  if (o.statusLabel) {
    content += calloutRow("НОВЫЙ СТАТУС", o.statusLabel, o.statusColor || BLUE);
    if (o.statusLine) {
      content += `<tr><td style="padding:12px 28px 0; font-family:${F};"><p style="margin:0; font-size:15px; line-height:1.6; color:#c8c8d0;">${escapeHtml(o.statusLine)}</p></td></tr>`;
    }
  }
  if (o.comment) content += commentRow(o.comment);
  content += `<tr><td style="padding:16px 28px 0; font-family:${F};"><p style="margin:0; font-size:13px; color:#8a8a92;">Номинация: ${escapeHtml(o.nominationTitle)} · Номер заявки: ${escapeHtml(o.appId)}</p></td></tr>`;
  content += buttonRow(`${SITE}/cabinet`, "Открыть в кабинете →");

  const preheader = o.statusLabel
    ? `Новый статус: ${o.statusLabel}`
    : "Комментарий по вашей заявке";
  const html = shell({ preheader, contentHtml: content });

  const tl: string[] = [`Здравствуйте, ${o.name || "участник"}!`, ""];
  if (o.statusLabel) {
    tl.push(`Статус вашей заявки на номинацию «${o.nominationTitle}» обновлён: ${o.statusLabel}.`);
    if (o.statusLine) tl.push(o.statusLine);
    tl.push("");
  }
  if (o.comment) tl.push("Комментарий эксперта:", o.comment, "");
  tl.push(`Номер заявки: ${o.appId}`, `Личный кабинет: ${SITE}/cabinet`, "", `— Оргкомитет, ${brand.org}`);
  return { html, text: tl.join("\n") };
}

/** Код подтверждения email при регистрации (6 цифр). */
export function renderVerificationCodeEmail(code: string): { html: string; text: string } {
  const content = `
    <tr><td style="padding:30px 28px 4px; font-family:${F};">
      <div style="font-size:20px; color:#f2f0ec; font-weight:bold; margin-bottom:14px;">Подтверждение email</div>
      <p style="margin:0 0 12px; font-size:15px; line-height:1.6; color:#c8c8d0;">Для завершения регистрации введите этот код на сайте:</p>
    </td></tr>
    <tr><td align="center" style="padding:10px 28px 20px;">
      <div style="display:inline-block; background:#111119; border:2px solid ${BLUE}; border-radius:14px; padding:20px 48px;">
        <span style="font-family:'Courier New',monospace; font-size:40px; font-weight:bold; color:${BLUE}; letter-spacing:12px;">${escapeHtml(code)}</span>
      </div>
    </td></tr>
    <tr><td style="padding:0 28px 10px; font-family:${F};">
      <p style="margin:0; font-size:13px; color:#8a8a92;">Код действителен в течение 10 минут. Если вы не запрашивали регистрацию — просто проигнорируйте это письмо.</p>
    </td></tr>`;
  const html = shell({ preheader: `Код подтверждения: ${code}`, contentHtml: content });
  const text = [
    "Подтверждение email",
    "",
    `Ваш код: ${code}`,
    "",
    "Код действителен в течение 10 минут.",
    "Если вы не запрашивали регистрацию — проигнорируйте это письмо.",
    "",
    `— Оргкомитет, ${brand.org}`,
  ].join("\n");
  return { html, text };
}

/** Код восстановления пароля. */
export function renderPasswordResetEmail(code: string): { html: string; text: string } {
  const content = `
    <tr><td style="padding:30px 28px 4px; font-family:${F};">
      <div style="font-size:20px; color:#f2f0ec; font-weight:bold; margin-bottom:14px;">Восстановление пароля</div>
      <p style="margin:0 0 12px; font-size:15px; line-height:1.6; color:#c8c8d0;">Мы получили запрос на смену пароля. Введите этот код на сайте:</p>
    </td></tr>
    <tr><td align="center" style="padding:10px 28px 20px;">
      <div style="display:inline-block; background:#111119; border:2px solid ${BLUE}; border-radius:14px; padding:20px 48px;">
        <span style="font-family:'Courier New',monospace; font-size:40px; font-weight:bold; color:${BLUE}; letter-spacing:12px;">${escapeHtml(code)}</span>
      </div>
    </td></tr>
    <tr><td style="padding:0 28px 10px; font-family:${F};">
      <p style="margin:0; font-size:13px; color:#8a8a92;">Код действителен в течение 10 минут. Если вы не запрашивали смену пароля — проигнорируйте это письмо.</p>
    </td></tr>`;
  const html = shell({ preheader: `Код восстановления: ${code}`, contentHtml: content });
  const text = [
    "Восстановление пароля",
    "",
    `Ваш код: ${code}`,
    "",
    "Код действителен в течение 10 минут.",
    "Если вы не запрашивали смену пароля — проигнорируйте это письмо.",
    "",
    `— Оргкомитет, ${brand.org}`,
  ].join("\n");
  return { html, text };
}
