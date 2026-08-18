#!/usr/bin/env bash
# Ежедневный бэкап БД «Труд крут» с ротацией.
# Ставится в cron (см. docs/ops/backup.md). DATABASE_URL берётся из .env приложения.
set -euo pipefail

BACKUP_DIR=/var/backups/premia
KEEP=14                         # сколько последних бэкапов хранить
ENV_FILE=/var/www/premia/.env

mkdir -p "$BACKUP_DIR"

# DATABASE_URL из .env: снимаем префикс, кавычки и хвост ?schema=... (pg_dump его не понимает)
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 \
  | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//' \
  | cut -d'?' -f1)
if [ -z "${DB_URL:-}" ]; then
  echo "DATABASE_URL не найден в $ENV_FILE" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/trudkrut-$TS.sql.gz"

pg_dump "$DB_URL" | gzip > "$OUT"
echo "бэкап создан: $OUT ($(du -h "$OUT" | cut -f1))"

# ротация: оставляем только последние $KEEP
ls -1t "$BACKUP_DIR"/trudkrut-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "всего бэкапов: $(ls -1 "$BACKUP_DIR"/trudkrut-*.sql.gz 2>/dev/null | wc -l)"
