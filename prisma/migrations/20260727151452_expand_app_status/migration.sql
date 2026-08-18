-- Расширение статусов заявки: добавляем этапы «Ожидает рассмотрения»,
-- «Требует доработки», «На оценке жюри». Значения дописываются в enum
-- (используются только в последующих транзакциях — безопасно в PG 12+).
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'revision';
ALTER TYPE "AppStatus" ADD VALUE IF NOT EXISTS 'scoring';
