import "dotenv/config";
import { db } from "../lib/db";
import { canonicalRegion } from "../lib/regions";

/**
 * Разовая нормализация регионов в уже поданных заявках: приводит поле
 * Application.region к каноническому названию субъекта РФ. Нужно, потому что
 * раньше регион был свободным полем, и в базу попали варианты вроде «татарстан»,
 * которые на «Географии премии» считались отдельным субъектом (дубль
 * «Республики Татарстан»).
 *
 * Идемпотентно: уже корректные значения не трогает.
 * Запуск на сервере после деплоя: npx tsx scripts/normalize-regions.ts
 */
async function main() {
  const apps = await db.application.findMany({ select: { id: true, region: true } });
  let changed = 0;
  for (const a of apps) {
    if (!a.region || a.region === "—") continue;
    const canon = canonicalRegion(a.region);
    if (canon && canon !== a.region) {
      await db.application.update({ where: { id: a.id }, data: { region: canon } });
      console.log(`  ${a.region}  →  ${canon}`);
      changed++;
    }
  }
  console.log(`Готово. Обновлено заявок: ${changed} из ${apps.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
