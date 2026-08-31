import "dotenv/config";
import { db } from "../lib/db";

/**
 * Ставит дату ОКОНЧАНИЯ приёма заявок активного сезона на 30 ноября 2026 (МСК).
 * Запуск на сервере после деплоя: npx tsx scripts/set-season-end.ts
 * (дату при необходимости поменяй в строке ниже).
 */
async function main() {
  const endAt = new Date("2026-11-30T23:59:59+03:00");
  const r = await db.season.updateMany({
    where: { isActive: true },
    data: { endAt },
  });
  console.log(`Обновлено сезонов: ${r.count}. Окончание приёма: ${endAt.toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
