# Развёртывание «Труд крут» на VPS (Ubuntu, РФ)

Пошаговая инструкция для выкладки на боевой сервер. Стек: Next.js 16 + PostgreSQL 16 + Node.js 20, за nginx с HTTPS. Домен: **премиятрудкрут.рф**.

> ⚠️ Виртуальный хостинг (Reg.ru «Host-0» и подобные) **не подходит** — нужен VPS/VDS/облачный сервер с root-доступом.

---

## 0. Характеристики сервера

| Параметр | Минимум | Рекомендуется |
|---|---|---|
| vCPU | 2 | 2–4 |
| RAM | 2 ГБ | **4 ГБ** (сборка Next.js прожорлива; на 1 ГБ падает) |
| Диск | 20 ГБ SSD | 40 ГБ SSD |
| ОС | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Расположение | **РФ** (152-ФЗ) | РФ |
| Доступ | root по SSH | root по SSH + свой SSH-ключ |

Если возьмёшь VPS с 2 ГБ RAM — добавь swap (см. раздел 9), иначе `next build` может убиться по памяти.

---

## 1. DNS: направить домен на сервер

В личном кабинете Reg.ru (управление доменом `премиятрудкрут.рф`) создать записи:

| Тип | Имя | Значение |
|---|---|---|
| A | @ | `IP_СЕРВЕРА` |
| A | www | `IP_СЕРВЕРА` |

Обновление DNS занимает от нескольких минут до пары часов. Проверить: `ping премиятрудкрут.рф`.

---

## 2. Первичная настройка сервера

Зайти по SSH под root:

```bash
ssh root@IP_СЕРВЕРА
```

Обновить систему и создать рабочего пользователя (не работать под root):

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
# перенести свой SSH-ключ пользователю deploy (если используешь ключи):
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Настроить фаервол (оставить SSH, HTTP, HTTPS):

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Дальше работаем под `deploy`: `su - deploy`.

---

## 3. Установить Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
npm -v
```

---

## 4. Установить и настроить PostgreSQL 16

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

Создать базу и пользователя (пароль придумать надёжный, записать):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER trudkrut WITH PASSWORD 'ПРИДУМАТЬ_НАДЁЖНЫЙ_ПАРОЛЬ';
CREATE DATABASE trud_krut OWNER trudkrut;
GRANT ALL PRIVILEGES ON DATABASE trud_krut TO trudkrut;
SQL
```

---

## 5. Забрать код на сервер

Вариант через git (если репозиторий доступен):

```bash
sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www
cd /var/www
git clone <URL_РЕПОЗИТОРИЯ> premia
cd premia
```

Либо загрузить архив проекта через `scp` с локальной машины:

```bash
# на локальной машине, из папки проекта:
rsync -av --exclude node_modules --exclude .next --exclude .env \
  ./ deploy@IP_СЕРВЕРА:/var/www/premia/
```

---

## 6. Переменные окружения (.env)

```bash
cd /var/www/premia
cp .env.production.example .env
nano .env
```

Заполнить в `.env`:
- `DATABASE_URL="postgresql://trudkrut:ПАРОЛЬ_ИЗ_ШАГА_4@localhost:5432/trud_krut?schema=public"`
- `NEXTAUTH_URL="https://премиятрудкрут.рф"`
- `AUTH_SECRET="..."` — сгенерировать: `openssl rand -base64 32`
- `NODE_ENV="production"`, `SEED_DEV_USERS="false"`
- SMTP/S3/капча — по мере готовности (можно оставить пустыми на старте).

---

## 7. Установка, миграции, данные, сборка

```bash
cd /var/www/premia
npm ci                       # установить зависимости
npx prisma generate          # сгенерировать клиент Prisma
npx prisma migrate deploy    # применить миграции к боевой БД
npx tsx prisma/seed.ts       # сезон + 13 номинаций (тест-юзеров НЕ создаёт при NODE_ENV=production)
npx tsx prisma/create-users.ts   # 7 профилей оргкомитета/жюри → логины/пароли в prisma/.created-users.local.txt
npm run build                # сборка прод-версии
```

> Логины/пароли сотрудников после `create-users.ts` — в файле `prisma/.created-users.local.txt`. Скачать себе и раздать людям по защищённому каналу, файл на сервере потом удалить.

Проверить запуск вручную: `npm run start` → должно подняться на `http://127.0.0.1:3000`. Остановить `Ctrl+C`.

---

## 8. Автозапуск через systemd

Создать сервис:

```bash
sudo nano /etc/systemd/system/premia.service
```

```ini
[Unit]
Description=Trud Krut (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/premia
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now premia
sudo systemctl status premia   # active (running)
```

---

## 9. (если RAM 2 ГБ) swap для сборки

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 10. nginx как обратный прокси

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/premia
```

> Домен `.рф` в конфигах nginx/certbot указывается в **punycode**.
> Для `премиятрудкрут.рф` это: **`xn--d1abjjhqhdcqeid5n.xn--p1ai`** (уже подставлено ниже).

```nginx
server {
    listen 80;
    server_name xn--d1abjjhqhdcqeid5n.xn--p1ai www.xn--d1abjjhqhdcqeid5n.xn--p1ai;

    client_max_body_size 25M;   # загрузка фото в заявке

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/premia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d xn--d1abjjhqhdcqeid5n.xn--p1ai -d www.xn--d1abjjhqhdcqeid5n.xn--p1ai
```

Certbot сам пропишет 443 и редирект с http→https. Автопродление уже настроено (`systemctl status certbot.timer`).

---

## 12. Проверка

- Открыть `https://премиятрудкрут.рф` — лендинг.
- `/apply` — форма заявки, отправить тестовую.
- `/login` → войти под `yakovlev@trudkrut.ru` → `/admin` (тёмная панель, заявка видна).
- Проверить логи при проблемах: `sudo journalctl -u premia -f`.

---

## 13. Обновление (передеплой)

```bash
cd /var/www/premia
git pull                       # или заново rsync
npm ci
npx prisma migrate deploy      # если были новые миграции
npm run build
sudo systemctl restart premia
```

---

## Частые проблемы

- **`next build` убит (Killed)** — не хватило RAM. Добавить swap (шаг 9) или взять план с 4 ГБ.
- **502 Bad Gateway** — сервис premia не запущен: `sudo systemctl status premia`, `journalctl -u premia -e`.
- **Ошибка подключения к БД** — проверить `DATABASE_URL`, что PostgreSQL запущен, пароль совпадает.
- **Домен не открывается** — DNS ещё не обновился; проверить `dig премиятрудкрут.рф`.
- **Сертификат не выпускается** — DNS должен уже указывать на сервер; домен в certbot — в punycode.
