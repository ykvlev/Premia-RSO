# SPEC.md — Веб-сервис Национальной премии «Труд крут»

> Спека для Claude Code. Положи файл в корень пустого репозитория, запусти `claude`, скажи:
> **«Прочитай SPEC.md и реализуй Фазу 0, затем жди подтверждения»**. Иди по фазам по порядку,
> не перескакивай. После каждой фазы — прогон, коммит, короткий отчёт что сделано.

---

## 1. Обзор

Веб-приложение для проведения ежегодной премии. Три части:

1. **Публичный лендинг** — презентация премии и номинаций, приём трафика.
2. **Форма подачи заявок** — поля зависят от выбранной номинации (данные-driven).
3. **Админ-панель с ролями жюри** — обработка заявок, экспертная оценка, рейтинг, экспорт.

Ключевой принцип: **номинации и их поля описываются декларативно в БД (json-схема), форма рендерится из схемы**. Смена номинаций от сезона к сезону — без правок кода.

## 2. Стек и конвенции

- **Next.js** 14+ (App Router, TypeScript, Server Actions где уместно)
- **Tailwind CSS** + **shadcn/ui** для компонентов
- **PostgreSQL** + **Prisma** (ORM, миграции)
- **NextAuth** (credentials-провайдер, роль в сессии/JWT)
- Валидация — **Zod** (общие схемы для клиента и сервера)
- Файлы — S3-совместимое хранилище через **@aws-sdk/client-s3**, эндпоинт и бакет в `.env` (расчёт на российское хранилище — Yandex Object Storage / VK Cloud)
- Email — nodemailer через SMTP из `.env`
- Пароли — `argon2` или `bcrypt`
- Линт/формат — ESLint + Prettier
- Структура: `app/` (роуты), `components/`, `lib/` (db, auth, s3, mail), `prisma/`

Конвенции: серверные проверки прав в каждом защищённом роуте (не полагаться на UI), все мутации валидируются Zod, никаких секретов в коде — только `.env`.

## 3. Роли

| Роль          | Права                                                                |
| ------------- | -------------------------------------------------------------------- |
| `guest`       | лендинг, подача заявки                                               |
| `participant` | своя заявка + просмотр статуса (личный кабинет — опция, см. §9)      |
| `jury`        | только закреплённые заявки: баллы по критериям + комментарий         |
| `admin`       | заявки, статусы, распределение по жюри, экспорт, статистика, контент |
| `superadmin`  | всё + пользователи, роли, номинации, критерии, настройки сезона      |

## 4. Модель данных (Prisma)

```prisma
enum Role { participant jury admin superadmin }
enum AppStatus { new review finalist winner rejected }

model User {
  id           String   @id @default(cuid())
  fio          String
  email        String   @unique
  passwordHash String
  role         Role     @default(participant)
  evaluations  Evaluation[]
  assignments  JuryAssignment[]
  createdAt    DateTime @default(now())
}

model Season {
  id            String   @id @default(cuid())
  year          Int
  startAt       DateTime
  endAt         DateTime
  isActive      Boolean  @default(false)
  scoringConfig Json     // веса критериев, формула агрегации
  nominations   Nomination[]
}

model Nomination {
  id              String  @id @default(cuid())
  seasonId        String
  season          Season  @relation(fields: [seasonId], references: [id])
  title           String
  description     String
  criteria        Json    // [{key, label, maxScore, weight}]
  participantType String  // работодатель / вуз / отделение / орган власти / СМИ / ...
  formSchema      Json    // поля формы: [{name, label, type, required, options}]
  applications    Application[]
  assignments     JuryAssignment[]
}

model Application {
  id              String   @id @default(cuid())
  nominationId    String
  nomination      Nomination @relation(fields: [nominationId], references: [id])
  participantType String
  orgName         String
  inn             String
  ogrn            String?
  region          String
  activityField   String?
  contactFio      String
  position        String?
  phone           String
  email           String
  links           String?
  payload         Json     // спец-поля номинации по formSchema
  status          AppStatus @default(new)
  attachments     Attachment[]
  evaluations     Evaluation[]
  createdAt       DateTime @default(now())
}

model Attachment {
  id            String @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id])
  filename      String
  url           String
  size          Int
  mime          String
}

model Evaluation {
  id            String @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id])
  juryUserId    String
  jury          User @relation(fields: [juryUserId], references: [id])
  scores        Json   // {criteriaKey: score}
  comment       String?
  createdAt     DateTime @default(now())
  @@unique([applicationId, juryUserId])
}

model JuryAssignment {
  id           String @id @default(cuid())
  juryUserId   String
  jury         User @relation(fields: [juryUserId], references: [id])
  nominationId String
  nomination   Nomination @relation(fields: [nominationId], references: [id])
  @@unique([juryUserId, nominationId])
}
```

## 5. Роуты

- `/` — лендинг
- `/apply` — форма подачи (публичная)
- `/apply/success` — подтверждение
- `/login` — вход (jury/admin/superadmin)
- `/jury` — кабинет жюри (роль jury)
- `/admin` — панель (роль admin/superadmin)
- `/admin/nominations`, `/admin/users` — управление (superadmin)
- `/api/*` или Server Actions — сабмит заявки, загрузка файлов, оценки, экспорт

## 6. Модуль: Лендинг (`/`)

Блоки сверху вниз: hero (название, сезон, суть, кнопка «Подать заявку», таймер до `Season.endAt`) → о премии и цель → логотипы организаторов/партнёров → **карточки номинаций** (title, description, criteria) → как участвовать (заявка → оценка жюри → итоги) → что даёт победа → итоги прошлых сезонов → FAQ → документы (PDF) → футер (контакты, соцсети, Политика конфиденциальности). Адаптив. Цвета/шрифты/лого — из брендбука (пока плейсхолдеры, вынести в `tailwind.config` и `lib/brand.ts`).

## 7. Модуль: Форма заявки (`/apply`)

1. Выбор номинации → грузим `formSchema` и `participantType`.
2. Общие поля: orgName, inn/ogrn, region, activityField, contactFio, position, phone, email, links.
3. Спец-поля номинации — **рендер из `formSchema`** (типы: text, textarea, number, select, url, file).
4. Загрузка файлов → S3, ограничение форматов и размера (из конфига).
5. Обязательный чекбокс согласия на обработку ПДн + капча (Yandex SmartCaptcha, заглушка если ключа нет).
6. Валидация Zod (обязательность, ИНН 10/12 цифр, email, телефон).
7. Сабмит → `Application` + `Attachment`, письмо-подтверждение участнику.
8. Вне окна `startAt..endAt` — форма закрыта, показать заглушку.

## 8. Модуль: Админка + жюри

**Admin (`/admin`):**

- таблица заявок: фильтры (номинация, регион, статус, дата), поиск, пагинация
- карточка заявки: все поля + скачивание вложений (pre-signed URL)
- смена статуса (new → review → finalist → winner / rejected)
- распределение заявок по жюри: назначение экспертов на номинацию (`JuryAssignment`)
- экспорт в **Excel (XLSX)**: заявки + сводные баллы (библиотека `exceljs`)
- дашборд: счётчики по номинациям/регионам/датам (простые графики)
- (опц.) уведомления о новых заявках — email/Telegram

**Jury (`/jury`):**

- список **только закреплённых** заявок (через `JuryAssignment`), прогресс «оценено N из M»
- форма оценки: баллы по критериям из `Nomination.criteria` (шкала до `maxScore`) + комментарий
- сохранение/редактирование до закрытия этапа; чужие оценки не видны

**Superadmin:** CRUD пользователей и ролей, CRUD номинаций/критериев, настройки сезона и весов.

**Подсчёт итогового балла:** агрегировать `Evaluation.scores` по всем жюри заявки с учётом весов из `scoringConfig` (по умолчанию — среднее взвешенное), строить рейтинг внутри номинации. Функция в `lib/scoring.ts`, покрыть юнит-тестами.

## 9. Нефункциональные

- ПДн по 152-ФЗ: хостинг и S3 на территории РФ, HTTPS, согласие перед сабмитом, Политика конфиденциальности
- Пароли — хэш; серверная проверка ролей на каждом защищённом роуте
- Журналирование действий в админке (кто/что/когда)
- Адаптив (десктоп/планшет/моб), актуальные браузеры
- Бэкапы БД и файлов — ежедневно (документировать, не реализовывать в коде)

## 10. Открытые вопросы (плейсхолдеры — засеять и потом заменить)

- Точный список номинаций, критерии и поля — **пока сделать сид (seed) с 2-3 примерами номинаций** в `prisma/seed.ts`, реальные придут от заказчика.
- Формула подсчёта баллов — по умолчанию среднее взвешенное, вынести в `scoringConfig`.
- Личный кабинет участника vs разовая отправка — **на старте: разовая отправка**, кабинет отметить как TODO.
- Юрлицо-оператор ПДн, текст согласия и Политики — плейсхолдеры в `lib/legal.ts`.

## 11. План по фазам (для Claude Code)

- **Фаза 0 — Каркас.** `create-next-app` (TS, Tailwind, App Router), настроить shadcn/ui, ESLint/Prettier, `.env.example`, Prisma init, подключить Postgres. Критерий: проект стартует, `prisma migrate dev` проходит.
- **Фаза 1 — Данные и авторизация.** Prisma-схема из §4, миграции, NextAuth (credentials, роли), `prisma/seed.ts` (сезон + 2-3 номинации + тестовые user'ы каждой роли). Критерий: логин под каждой ролью, сид отрабатывает.
- **Фаза 2 — Лендинг.** Статичные блоки §6 с данными из БД (номинации). Критерий: адаптивный лендинг, карточки номинаций из сида.
- **Фаза 3 — Форма заявки.** Динамический рендер из `formSchema`, валидация Zod, загрузка файлов в S3, письмо-подтверждение, окно приёма. Критерий: заявка сохраняется с вложениями, приходит письмо.
- **Фаза 4 — Админка.** Таблица с фильтрами, карточка заявки, статусы, распределение по жюри, экспорт XLSX, дашборд. Критерий: админ обрабатывает заявку полностью.
- **Фаза 5 — Жюри и оценка.** Кабинет жюри, форма оценки, `lib/scoring.ts` + тесты, рейтинг в админке. Критерий: жюри оценивает закреплённые заявки, рейтинг считается автоматически.
- **Фаза 6 — Харденинг.** Проверки ролей на всех роутах, журналирование, аккуратные ошибки, адаптив, README с деплоем на РФ-хостинг. Критерий: нет доступа к чужим данным, проходит базовый чек безопасности.

После каждой фазы: `npm run lint`, `npm run build`, коммит с осмысленным сообщением, короткий отчёт.
