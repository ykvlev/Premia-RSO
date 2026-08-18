#!/usr/bin/env bash
# Деплой с Мака на прод по SSH (обычный способ, запускать ДОМА на рабочей сети).
# Запуск из папки проекта:  bash deploy-ssh.sh
# Делает: rsync исходников (с докачкой и повторами) → prisma generate →
# migrate deploy → build → restart. Runtime на сервере (.env, node_modules,
# загрузки, prisma-клиент) не трогает.
set -euo pipefail

KEY="$HOME/.ssh/premia_deploy"
HOST="root@194.67.66.183"
APP="/var/www/premia"
SSH_OPTS="-o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o StrictHostKeyChecking=no"

echo "== 1/2 rsync исходников (докачка + повторы при обрыве) =="
ok=0
for i in 1 2 3 4 5 6; do
  if rsync -az --partial --timeout=30 \
      -e "ssh -i $KEY $SSH_OPTS" \
      --exclude node_modules --exclude .next --exclude .git --exclude .env \
      --exclude 'lib/generated' --exclude '.created-users.local.txt' \
      ./ "$HOST:$APP/"; then
    ok=1; break
  fi
  echo "  ...попытка $i оборвалась, повтор через 3с"
  sleep 3
done
[ "$ok" = 1 ] || { echo "rsync не смог за 6 попыток — SSH нестабилен, попробуй позже"; exit 1; }

echo "== 2/2 prisma generate → migrate deploy → build → restart =="
ssh -i "$KEY" $SSH_OPTS "$HOST" \
  "cd $APP && npx prisma generate && npx prisma migrate deploy && npm run build && systemctl restart premia && sleep 2 && systemctl is-active premia && echo '=== ДЕПЛОЙ ГОТОВ ==='"
