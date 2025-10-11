# My Site – FastAPI + PostgreSQL Version

Полнофункциональный веб-сайт с коллекцией интерактивных страниц для управления изображениями, закладками, цветами, цитатами, погодой и профилем GitHub. Теперь на **FastAPI с PostgreSQL**!

---

## 🆕 Что нового в FastAPI + PostgreSQL версии

* 🚀 **Высокая производительность** — FastAPI один из самых быстрых Python-фреймворков
* 🗄️ **PostgreSQL база данных** — реляционное хранение данных вместо JSON файлов
* 📚 **Автоматическая документация** — Swagger UI доступен по `/docs`
* 🐍 **Python экосистема** — доступ ко всем библиотекам Python
* 🔧 **Асинхронность** — улучшенная обработка множественных запросов
* 📝 **Pydantic валидация** — автоматическая проверка данных
* 🎨 **9+ интерактивных страниц** — полный набор инструментов
* 🌤️ **Новая страница погоды** — умная система прогноза погоды
* 🔗 **Связи между данными** — внешние ключи и целостность данных

---

## 🌟 Возможности для пользователей

### 🖼️ Галерея изображений

* Drag & Drop загрузка
* Вставка из буфера (Ctrl+V)
* Загрузка по URL
* Множественный выбор файлов
* Неограниченные папки
* 3D эффекты и Masonry-сетка
* Модальный просмотр и пагинация
* Избранное и переименование файлов

### 📚 Умная система закладок

* Три режима отображения (сетка, список, masonry)
* Категории: Работа, Игры, Новости, Развлечения, Спорт и др.
* Автоматическое получение фавиконов
* Поиск, сортировка и добавление через модальное окно

### 🎨 Генератор цветов

* HSL слайдеры и генерация палитр
* Сохранение и копирование HEX, RGB, HSL
* Случайные цвета и предпросмотр

### 💫 Случайные цитаты

* Цитаты на русском и английском
* Фильтрация, озвучивание, избранное и история
* Автообновление и копирование

### 🌤️ Прогноз погоды (НОВАЯ СТРАНИЦА)

* 150+ городов (база в PostgreSQL)
* Автоподстановка и геолокация
* Текущая погода и прогноз на 5 дней
* Русскоязычные описания и оффлайн-кэширование

### ⭐ GitHub Профиль

* Просмотр профиля через GitHub API
* Репозитории, подписки и README
* Подсветка синтаксиса и просмотр изображений

### 🎭 Параллакс-страницы

* 🌳 **Параллакс-путь** — 3D эффекты при скролле
* 🧙‍♂️ **Мир Ведьмака** — параллакс-слайдер с частицами
* 🌿 **Grow** — плавные переходы и текстовые эффекты

### 🎯 Персонализация и темы

* Светлая/тёмная тема (авто и ручное переключение)
* Сохранение между сессиями
* Регулировка плиток и колонок

---

## 🛠 Технологии

### Frontend

* HTML5, CSS3, Vanilla JS
* Masonry.js, GSAP, Swiper.js, Canvas API

### Backend

* **FastAPI** — высокопроизводительный фреймворк
* **PostgreSQL** — реляционная база данных
* **Psycopg2** — адаптер PostgreSQL
* **httpx**, **Pydantic**, **Aiofiles**, **Pillow**, **python-dotenv**

### Хранение данных

* PostgreSQL — структурированные данные
* Файловая система — изображения
* LocalStorage — пользовательские настройки
* .env — ключи и конфигурации

---

## 🗄️ Архитектура базы данных

```sql
-- Категории для закладок
categories (id, name, created_at)

-- Закладки
bookmarks (id, title, url, category_id, created_at)

-- Города для погодного модуля
cities (id, name, country, lat, lon)

-- Галереи
galleries (id, name, folder_path, created_at)

-- Изображения в галереях
gallery_images (id, gallery_id, file_path, width, height, created_at)

-- Категории цитат
quote_categories (id, category_id, name, language)

-- Цитаты
quotes (id, text, author, category_id, language, year, source, tags, created_at)
```

### Преимущества архитектуры

* ✅ Целостность данных (внешние ключи)
* ✅ Быстродействие (индексы и транзакции)
* ✅ Масштабируемость и резервное копирование

---

## 📁 Структура проекта

```text
project/
├── main.py
├── requirements.txt
├── .env
├── static/
│   ├── assets/weather-icon.ico
│   ├── css/weather-style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── bookmarks-page.js
│   │   ├── gallery-page.js
│   │   ├── quotes.js
│   │   ├── weather.js
│   │   └── main-page.js
│   └── uploads/
├── templates/
│   ├── index.html
│   ├── gallery.html
│   ├── bookmarks.html
│   ├── github.html
│   ├── parallax.html
│   ├── witcher.html
│   ├── grow.html
│   ├── color-generator.html
│   ├── quotes.html
│   └── weather.html
└── README.md
```

---

## 🚀 Установка и запуск

### Требования

* Python 3.8+
* PostgreSQL 12+
* pip

### 1️⃣ Установка зависимостей

```bash
git clone <repository-url>
cd my-gallery-fastapi
pip install -r requirements.txt
```

### 2️⃣ Настройка базы данных

```sql
CREATE DATABASE my_app_db;
```

**.env файл:**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_app_db
DB_USER=your_username
DB_PASSWORD=your_password
OPENWEATHER_API_KEY=ваш_ключ
```

### 3️⃣ Запуск

```bash
uvicorn main:app --reload --port 3000
```

* Сервер: [http://localhost:3000](http://localhost:3000)
* Документация: [http://localhost:3000/docs](http://localhost:3000/docs)

---

## 🔌 API Эндпоинты

### Галереи

| Метод | Эндпоинт            | Описание                  |
| ----- | ------------------- | ------------------------- |
| GET   | /api/galleries      | Получить все галереи      |
| POST  | /api/create-gallery | Создать галерею           |
| POST  | /api/upload         | Загрузить изображения     |
| POST  | /api/rename         | Переименовать изображение |
| POST  | /api/delete-image   | Удалить изображение       |

### Закладки

| Метод  | Эндпоинт            | Описание           |
| ------ | ------------------- | ------------------ |
| GET    | /api/bookmarks      | Получить закладки  |
| POST   | /api/bookmarks      | Создать закладку   |
| DELETE | /api/bookmarks/{id} | Удалить закладку   |
| GET    | /api/categories     | Получить категории |

### Цитаты

| Метод | Эндпоинт    | Описание            |
| ----- | ----------- | ------------------- |
| GET   | /api/quotes | Получить все цитаты |

### Погода

| Метод | Эндпоинт              | Описание                |
| ----- | --------------------- | ----------------------- |
| GET   | /api/weather          | Получить текущую погоду |
| GET   | /api/weather/forecast | Прогноз на 5 дней       |
| GET   | /api/weather-api-key  | Проверка API ключа      |
| GET   | /api/cities           | Автоподстановка городов |

---

## ⚙️ Настройка

### GitHub интеграция

```js
let currentProfile = 'YourGitHubUsername';
const myUsername = 'YourGitHubUsername';
```

### OpenWeatherMap

```env
OPENWEATHER_API_KEY=ваш_ключ_от_openweathermap
```

### PostgreSQL настройки

```sql
CREATE USER my_app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE my_app_db TO my_app_user;
ALTER DATABASE my_app_db SET timezone TO 'UTC';
```

---

## 🔄 Миграция с JSON на PostgreSQL

| Аспект             | Было (JSON)     | Стало (PostgreSQL) |
| ------------------ | --------------- | ------------------ |
| Хранение           | Файлы           | Реляционная БД     |
| Целостность        | Ручная          | Внешние ключи      |
| Производительность | Медленный поиск | Быстрые запросы    |
| Масштабируемость   | Ограничено      | Гибкое расширение  |

### Преимущества миграции

* 🚀 Повышенная производительность
* 🔒 Целостность данных
* 📈 Масштабируемость
* 🛠 Совместимость с экосистемой PostgreSQL
* 💾 Резервное копирование

---

## 🐛 Отладка и мониторинг

### Логирование

* Подключение к БД
* SQL запросы
* Ошибки и загрузка файлов

### Мониторинг PostgreSQL

```sql
SELECT pg_size_pretty(pg_database_size('my_app_db'));
SELECT count(*) FROM pg_stat_activity WHERE datname = 'my_app_db';
SELECT schemaname, tablename, seq_scan, seq_tup_read FROM pg_stat_user_tables;
```

---

## 📄 Лицензия

Проект распространяется по лицензии **MIT**.

---

## 👨‍💻 Автор

Создано с любовью к UX и визуализации цифрового контента.

---

## 🎉 Итоги миграции

Проект успешно переведён с JSON файлов на PostgreSQL:

* ✅ Промышленная надёжность
* ✅ Высокая производительность
* ✅ Лёгкое масштабирование
* ✅ Современная архитектура

Все 9+ интерактивных страниц работают идеально с новым бэкендом! 🐍🚀🗄️
