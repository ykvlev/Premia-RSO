import "dotenv/config";
import { db } from "../lib/db";

/**
 * Ставит дату СТАРТА приёма заявок активного сезона на 1 сентября 2026 (МСК).
 * Запуск на сервере после деплоя: npx tsx scripts/set-season-start.ts
 * (дату при необходимости поменяй в строке ниже).
 */
async function main() {
  const startAt = new Date("2026-09-01T00:00:00+03:00");
  const r = await db.season.updateMany({
    where: { isActive: true },
    data: { startAt },
  });
  console.log(`Обновлено сезонов: ${r.count}. Старт приёма: ${startAt.toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
