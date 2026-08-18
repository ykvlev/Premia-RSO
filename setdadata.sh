#!/bin/bash
ENV=/var/www/premia/.env
read -p "Вставь токен DaData (API-ключ Подсказки) и нажми Enter: " T
if [ -z "$T" ]; then echo "Пусто — отмена."; exit 1; fi
sed -i '/^DADATA_TOKEN=/d' "$ENV"
echo "DADATA_TOKEN=\"$T\"" >> "$ENV"
systemctl restart premia
code=$(curl -s -o /tmp/dd.json -w "%{http_code}" -X POST https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party -H "Content-Type: application/json" -H "Accept: application/json" -H "Authorization: Token $T" -d '{"query":"7707083893","count":1}')
if [ "$code" = "200" ] && grep -qi 'сбербанк\|sberbank' /tmp/dd.json; then
  echo "OK: токен работает — тест по ИНН 7707083893 нашёл Сбербанк"
else
  echo "ОШИБКА: токен не сработал (HTTP $code). Скопируй именно API-ключ раздела «Подсказки»."
fi
rm -f /tmp/dd.json
