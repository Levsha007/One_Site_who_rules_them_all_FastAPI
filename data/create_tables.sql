-- 1. Таблица категорий
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Таблица закладок
CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Таблица городов
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    lat DECIMAL(10, 6) NOT NULL,
    lon DECIMAL(10, 6) NOT NULL
);

-- 4. Таблица галерей
CREATE TABLE galleries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    folder_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Таблица изображений галерей
CREATE TABLE gallery_images (
    id SERIAL PRIMARY KEY,
    gallery_id INTEGER REFERENCES galleries(id),
    file_path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Таблица категорий цитат
CREATE TABLE quote_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL,
    UNIQUE(category_id, language)
);

-- 7. Таблица цитат
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    author VARCHAR(200),
    category_id VARCHAR(50),
    language VARCHAR(10) NOT NULL,
    origin TEXT,
    language_original VARCHAR(50),
    year VARCHAR(50),
    source VARCHAR(200),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);