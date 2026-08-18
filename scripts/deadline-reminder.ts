import "dotenv/config";
import { db } from "../lib/db";
import { sendMail } from "../lib/mail";
import { brand } from "../lib/brand";

/**
 * Напоминание о дедлайне приёма заявок. Ставится в cron (ежедневно), но письма
 * шлёт только на «вехах» — за 7, 3 и 1 день до закрытия (чтобы не спамить).
 * Получатели — зарегистрированные участники (могут подать заявки на др. номинации).
 * Запуск: npx tsx scripts/deadline-reminder.ts
 */

const MILESTONES = [7, 3, 1];

async function main() {
  const season = await db.season.findFirst({ where: { isActive: true } });
  if (!season) {
    console.log("Нет активного сезона — пропуск");
    return;
  }
  const now = new Date();
  const end = new Date(season.endAt);
  const msLeft = end.getTime() - now.getTime();
  if (msLeft <= 0) {
    console.log("Приём уже закрыт — пропуск");
    return;
  }
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  if (!MILESTONES.includes(daysLeft)) {
    console.log(`До дедлайна ${daysLeft} дн. — не веха (${MILESTONES.join("/")}), пропуск`);
    return;
  }

  const users = await db.user.findMany({
    where: { role: "participant" },
    select: { email: true, fio: true },
  });
  const endStr = end.toLocaleDateString("ru-RU");
  const dayWord = daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней";

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    if (!u.email.includes("@")) continue;
    try {
      await sendMail({
        to: u.email,
        subject: `Приём заявок закрывается ${endStr} — ${brand.fullName}`,
        text: [
          `Здравствуйте, ${u.fio || "участник"}!`,
          "",
          `Напоминаем: приём заявок на ${brand.fullName} закрывается ${endStr} — осталось ${daysLeft} ${dayWord}.`,
          "Если планируете подать заявки на другие номинации — успейте это сделать:",
          "https://премиятрудкрут.рф/apply",
          "",
          `— Оргкомитет, ${brand.org}`,
        ].join("\n"),
      });
      sent++;
    } catch (e) {
      failed++;
      console.error("Напоминание не отправлено:", u.email, e);
    }
  }
  console.log(`Веха ${daysLeft} дн.: отправлено ${sent}, ошибок ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
