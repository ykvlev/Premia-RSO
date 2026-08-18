#!/usr/bin/env bash
# Серверный деплой в обход SSH: код тянется из публичного GitHub-репо,
# runtime-файлы (.env, node_modules, загрузки, сгенерённый prisma-клиент) сохраняются.
set -euo pipefail

APP=/var/www/premia
TMP=/tmp/premia-deploy-src
REPO=https://github.com/ykvlev/premia-deploy.git

echo "== 1/6 клонирую свежий код =="
rm -rf "$TMP"
git clone --depth 1 "$REPO" "$TMP"
echo "HEAD: $(cd "$TMP" && git rev-parse --short HEAD)"

echo "== 2/6 переношу исходники в $APP (runtime сохраняем) =="
rsync -a \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude .env \
  --exclude 'lib/generated' \
  --exclude '.created-users.local.txt' \
  --exclude deploy.sh \
  "$TMP"/ "$APP"/

cd "$APP"

echo "== 3/6 зависимости (если node_modules отсутствует) =="
[ -d node_modules ] || npm install --no-audit --no-fund

echo "== 4/6 prisma generate + migrate deploy =="
npx prisma generate
npx prisma migrate deploy

echo "== 5/6 сборка =="
npm run build

echo "== 6/6 перезапуск сервиса =="
systemctl restart premia
sleep 2
systemctl --no-pager -l status premia | head -6 || true

rm -rf "$TMP"
echo "=========================================="
echo "=== ДЕПЛОЙ ГОТОВ ==="
echo "=========================================="
