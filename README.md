# 🚾 Toilet Finder — Production MVP

PWA-приложение для поиска и добавления общественных туалетов.  
Стек: **Vue 3 + Vite + Supabase + Leaflet + Cloudflare Pages**

---

## 📂 Архитектура проекта

```
src/
├── app/
│   ├── router.js              # Vue Router (lazy-loaded routes)
│   ├── styles/global.css      # Глобальные стили, CSS-переменные
│   └── views/
│       ├── MapView.vue        # Главная карта
│       ├── AuthView.vue       # Авторизация
│       └── ProfileView.vue    # Профиль пользователя
├── modules/
│   ├── auth/
│   │   └── store.js           # Pinia: авторизация, профиль
│   ├── map/
│   │   └── MapService.js      # Leaflet: карта, маркеры, кластеризация
│   └── toilets/
│       ├── store.js           # Pinia: туалеты, голоса, репорты
│       ├── AddToiletModal.vue # Модалка добавления точки
│       └── ReportModal.vue    # Модалка жалобы
├── shared/
│   └── services/
│       ├── supabase.js        # Supabase client singleton
│       └── ads.js             # AdsService (заглушка для YAN)
├── App.vue
└── main.js
supabase/
└── schema.sql                 # Вся схема БД + RLS + триггеры
```

---

## 🚀 Деплой: пошаговая инструкция

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в **SQL Editor** и выполните `supabase/schema.sql`
3. В **Authentication → Providers** включите Email и Google OAuth
4. Скопируйте **Project URL** и **anon public key** из Settings → API

### 2. Google OAuth (опционально)

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → OAuth 2.0 Client
3. Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Добавьте Client ID и Secret в Supabase → Auth → Google

### 3. Локальная разработка

```bash
# Клонировать и установить зависимости
git clone <repo>
cd toilet-finder
npm install

# Создать .env
cp .env.example .env
# Заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Запустить dev-сервер
npm run dev
```

### 4. Сборка

```bash
npm run build
# Результат в папке dist/
```

### 5. Деплой на Cloudflare Pages

#### Вариант A: через GitHub (рекомендуется)

1. Загрузите проект на GitHub
2. В [Cloudflare Pages](https://pages.cloudflare.com) → Create a project → Connect to Git
3. Настройки сборки:
   - **Framework preset**: Vue
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Переменные окружения (Settings → Environment variables):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_DEFAULT_CITY=moscow
   VITE_DEFAULT_LAT=55.7558
   VITE_DEFAULT_LNG=37.6173
   VITE_DEFAULT_ZOOM=13
   ```
5. Deploy!

#### Вариант B: Wrangler CLI

```bash
npm install -g wrangler
wrangler pages deploy dist --project-name toilet-finder
```

### 6. Настройка домена

В Cloudflare Pages → Custom domains → добавьте свой домен.  
SSL выдаётся автоматически.

---

## 🗄 База данных

Схема создаётся одним файлом `supabase/schema.sql`:

| Таблица | Назначение |
|---|---|
| `users_profile` | Профили пользователей, роли, очки, подписка |
| `toilets` | Точки на карте с координатами и статусом |
| `votes` | Голоса (unique constraint: 1 голос/пользователь) |
| `reports` | Жалобы на точки |

**RPC-функции:**
- `can_add_toilet(user_id)` — проверка лимита 3 точки/день
- `get_toilets_in_bounds(...)` — загрузка точек по bounding box
- `has_voted(toilet_id, user_id)` — проверка голоса

**Триггеры:**
- `on_vote_insert` — пересчёт голосов, автоподтверждение при 10+
- `on_auth_user_created` — создание профиля при регистрации

---

## 📢 Интеграция Яндекс Рекламной Сети (YAN)

1. Зарегистрируйтесь в [partner.yandex.ru](https://partner.yandex.ru)
2. Получите Block ID
3. В `src/shared/services/ads.js` раскомментируйте блоки с YAN и замените `YOUR_BLOCK_ID`

---

## 🌍 Добавление нового города

1. Добавьте маршрут `/toilets/newcity` — работает автоматически
2. При загрузке точек передаётся `p_city` в RPC-функцию
3. Добавьте label в `MapView.vue` в объект `cityLabel`

---

## 📊 Метрики

Доступны через view `public.metrics` в Supabase:
```sql
SELECT * FROM public.metrics;
```
Возвращает: total_toilets, confirmed_toilets, total_votes, added_today, DAU.

---

## 🔑 Переменные окружения

| Переменная | Описание |
|---|---|
| `VITE_SUPABASE_URL` | URL вашего Supabase проекта |
| `VITE_SUPABASE_ANON_KEY` | Публичный anon ключ Supabase |
| `VITE_DEFAULT_CITY` | Город по умолчанию (moscow) |
| `VITE_DEFAULT_LAT` | Широта центра по умолчанию |
| `VITE_DEFAULT_LNG` | Долгота центра по умолчанию |
| `VITE_DEFAULT_ZOOM` | Зум карты по умолчанию |
