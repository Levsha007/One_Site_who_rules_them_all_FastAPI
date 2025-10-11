# main.py - FastAPI сервер с PostgreSQL
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
import json
import os
import aiofiles
import shutil
from pathlib import Path
import httpx
from typing import List, Optional
import uuid
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Загружаем переменные окружения
load_dotenv()

# Инициализация FastAPI
app = FastAPI(title="My Gallery", version="1.0.0")

# Настройка путей
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
UPLOADS_DIR = STATIC_DIR / "uploads"

# Создаём необходимые папки
for directory in [UPLOADS_DIR, UPLOADS_DIR / "temp"]:
    directory.mkdir(exist_ok=True)

# ==================== БАЗА ДАННЫХ ====================

def get_db_connection():
    """Создание подключения к PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            database=os.getenv('DB_NAME', 'my_app_db'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', ''),
            port=os.getenv('DB_PORT', '5432'),
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        return None

def init_database():
    """Инициализация базы данных при первом запуске"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Проверяем существование таблиц
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        existing_tables = [row['table_name'] for row in cursor.fetchall()]
        
        # Если таблиц нет - создаем начальные данные
        if not existing_tables:
            print("🔄 Инициализация базы данных...")
            
            # Создаем таблицы
            cursor.execute("""
                CREATE TABLE categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE bookmarks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(500) NOT NULL,
                    url TEXT NOT NULL,
                    category_id INTEGER REFERENCES categories(id),
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE cities (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    country VARCHAR(100) NOT NULL,
                    lat DECIMAL(10, 6) NOT NULL,
                    lon DECIMAL(10, 6) NOT NULL
                );

                CREATE TABLE galleries (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    folder_path TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE gallery_images (
                    id SERIAL PRIMARY KEY,
                    gallery_id INTEGER REFERENCES galleries(id),
                    file_path TEXT NOT NULL,
                    width INTEGER,
                    height INTEGER,
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE quote_categories (
                    id SERIAL PRIMARY KEY,
                    category_id VARCHAR(50) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    language VARCHAR(10) NOT NULL,
                    UNIQUE(category_id, language)
                );

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
            """)
            
            # Добавляем начальные категории
            default_categories = ["Работа", "Образование", "Игры", "Новости", "Развлечения", "Социальные сети", "Спорт", "Технологии"]
            for category in default_categories:
                cursor.execute("INSERT INTO categories (name) VALUES (%s)", (category,))
            
            # Добавляем начальные города
            basic_cities = [
                ("Москва", "Россия", 55.7558, 37.6173),
                ("Санкт-Петербург", "Россия", 59.9343, 30.3351),
                ("Новосибирск", "Россия", 55.0084, 82.9357),
                ("Екатеринбург", "Россия", 56.8389, 60.6057),
                ("Казань", "Россия", 55.8304, 49.0661),
                ("Нижний Новгород", "Россия", 56.2965, 43.9361),
                ("Челябинск", "Россия", 55.1644, 61.4368),
                ("Самара", "Россия", 53.2415, 50.2212),
                ("Омск", "Россия", 54.9885, 73.3242),
                ("Ростов-на-Дону", "Россия", 47.2357, 39.7015),
                ("Уфа", "Россия", 54.7388, 55.9721),
                ("Красноярск", "Россия", 56.0153, 92.8932),
                ("Воронеж", "Россия", 51.6755, 39.2089),
                ("Пермь", "Россия", 58.0105, 56.2502),
                ("Волгоград", "Россия", 48.708, 44.5133),
                ("Киев", "Украина", 50.4501, 30.5234),
                ("Минск", "Беларусь", 53.9045, 27.5615),
                ("Астана", "Казахстан", 51.1694, 71.4491),
                ("Алматы", "Казахстан", 43.2383, 76.9455),
                ("Лондон", "Великобритания", 51.5074, -0.1278),
                ("Париж", "Франция", 48.8566, 2.3522),
                ("Берлин", "Германия", 52.52, 13.405),
                ("Мадрид", "Испания", 40.4168, -3.7038),
                ("Рим", "Италия", 41.9028, 12.4964),
                ("Прага", "Чехия", 50.0755, 14.4378),
                ("Вена", "Австрия", 48.2082, 16.3738),
                ("Амстердам", "Нидерланды", 52.3676, 4.9041),
                ("Брюссель", "Бельгия", 50.8503, 4.3517),
                ("Стамбул", "Турция", 41.0082, 28.9784),
                ("Дубай", "ОАЭ", 25.2048, 55.2708),
                ("Токио", "Япония", 35.6762, 139.6503),
                ("Пекин", "Китай", 39.9042, 116.4074),
                ("Сеул", "Корея", 37.5665, 126.978),
                ("Нью-Йорк", "США", 40.7128, -74.006),
                ("Лос-Анджелес", "США", 34.0522, -118.2437),
                ("Чикаго", "США", 41.8781, -87.6298),
                ("Торонто", "Канада", 43.6532, -79.3832),
                ("Сидней", "Австралия", -33.8688, 151.2093)
            ]
            for city in basic_cities:
                cursor.execute("INSERT INTO cities (name, country, lat, lon) VALUES (%s, %s, %s, %s)", city)
            
            conn.commit()
            print("✅ База данных инициализирована")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка инициализации БД: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

# Инициализируем БД при запуске
init_database()

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Настраиваем шаблоны
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# ==================== РОУТЫ ДЛЯ СТРАНИЦ ====================

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/gallery", response_class=HTMLResponse)
async def read_gallery(request: Request):
    return templates.TemplateResponse("gallery.html", {"request": request})

@app.get("/favorites", response_class=HTMLResponse)
async def read_favorites(request: Request):
    return templates.TemplateResponse("bookmarks.html", {"request": request})

@app.get("/github", response_class=HTMLResponse)
async def read_github(request: Request):
    return templates.TemplateResponse("github.html", {"request": request})

@app.get("/parallax", response_class=HTMLResponse)
async def read_parallax(request: Request):
    return templates.TemplateResponse("parallax.html", {"request": request})

@app.get("/witcher", response_class=HTMLResponse)
async def read_witcher(request: Request):
    return templates.TemplateResponse("witcher.html", {"request": request})

@app.get("/color-generator", response_class=HTMLResponse)
async def read_color_generator(request: Request):
    return templates.TemplateResponse("color-generator.html", {"request": request})

@app.get("/quotes", response_class=HTMLResponse)
async def read_quotes(request: Request):
    return templates.TemplateResponse("quotes.html", {"request": request})

@app.get("/grow", response_class=HTMLResponse)
async def read_grow(request: Request):
    return templates.TemplateResponse("grow.html", {"request": request})

@app.get("/weather", response_class=HTMLResponse)
async def read_weather(request: Request):
    return templates.TemplateResponse("weather.html", {"request": request})

# ==================== API ДЛЯ ЦИТАТ ====================

@app.get("/api/quotes")
async def get_quotes():
    """Получить все цитаты из БД"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT text, author, category_id, language, origin, 
                   language_original, year, source, tags
            FROM quotes
        """)
        quotes = cursor.fetchall()
        return quotes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения цитат: {e}")
    finally:
        conn.close()

# ==================== API ДЛЯ ПОГОДЫ ====================

@app.get("/api/weather")
async def get_weather(city: str = None, lat: float = None, lon: float = None):
    """Получить текущую погоду"""
    api_key = os.getenv('OPENWEATHER_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="API ключ не настроен")
    
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Укажите город или координаты")
    
    if city:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=ru"
    else:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=ru"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            weather_data = response.json()
            
            if weather_data.get('cod') != 200:
                raise HTTPException(status_code=404, detail=weather_data.get('message', 'Город не найден'))
                
            return weather_data
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка подключения к API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка API: {str(e)}")

@app.get("/api/weather/forecast")
async def get_weather_forecast(lat: float, lon: float):
    """Получить прогноз погоды на 5 дней"""
    api_key = os.getenv('OPENWEATHER_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="API ключ не настроен")
    
    url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=ru"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            forecast_data = response.json()
            
            if forecast_data.get('cod') != '200':
                raise HTTPException(status_code=404, detail=forecast_data.get('message', 'Прогноз не найден'))
                
            return forecast_data
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка подключения к API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка API: {str(e)}")

@app.get("/api/weather-api-key")
async def get_weather_api_key():
    """Получить статус API ключа"""
    api_key = os.getenv('OPENWEATHER_API_KEY')
    return {"hasKey": bool(api_key), "apiKey": "configured" if api_key else None}

@app.get("/api/cities")
async def get_cities(search: str = None):
    """Получить города из БД для автоподстановки"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        if search:
            cursor.execute(
                "SELECT name, country, lat, lon FROM cities WHERE name ILIKE %s OR country ILIKE %s LIMIT 20",
                (f'%{search}%', f'%{search}%')
            )
        else:
            cursor.execute("SELECT name, country, lat, lon FROM cities LIMIT 20")
        
        cities = cursor.fetchall()
        return cities
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения городов: {e}")
    finally:
        conn.close()

# ==================== API ДЛЯ ГАЛЕРЕЙ ====================

@app.get("/api/galleries")
async def get_galleries():
    """Получить все галереи из БД"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        
        # Получаем галереи
        cursor.execute("SELECT id, name, folder_path FROM galleries")
        galleries = cursor.fetchall()
        
        # Для каждой галереи получаем изображения, отсортированные по ID в порядке убывания
        for gallery in galleries:
            cursor.execute("""
                SELECT file_path, width, height 
                FROM gallery_images 
                WHERE gallery_id = %s
                ORDER BY id DESC  -- ← ДОБАВЛЕНО: сортировка по убыванию ID
            """, (gallery['id'],))
            gallery['images'] = cursor.fetchall()
        
        return galleries
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения галерей: {e}")
    finally:
        conn.close()

@app.post("/api/galleries")
async def create_gallery(request: Request):
    """Создать новую галерею"""
    data = await request.json()
    name = data.get('name')
    
    if not name:
        raise HTTPException(status_code=400, detail="Имя папки обязательно")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        
        # Проверяем существование
        cursor.execute("SELECT id FROM galleries WHERE name = %s", (name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Папка с таким именем уже существует")
        
        # Создаём папку
        gallery_path = UPLOADS_DIR / name
        gallery_path.mkdir(exist_ok=True)
        
        # Добавляем в БД
        cursor.execute(
            "INSERT INTO galleries (name, folder_path) VALUES (%s, %s) RETURNING id",
            (name, f"static/uploads/{name}")
        )
        
        conn.commit()
        return {"success": True, "name": name}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания галереи: {e}")
    finally:
        conn.close()

@app.post("/api/upload")
async def upload_images(
    gallery: str = Form(...),
    urls: Optional[str] = Form(None),
    images: List[UploadFile] = File([])
):
    """Загрузить изображения в галерею"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        
        # Получаем ID галереи
        cursor.execute("SELECT id FROM galleries WHERE name = %s", (gallery,))
        gallery_result = cursor.fetchone()
        if not gallery_result:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        gallery_id = gallery_result['id']
        new_images = []
        
        # Обработка URL
        if urls and urls.strip():
            url_list = [url.strip() for url in urls.split('\n') if url.strip()]
            for url in url_list:
                if url.startswith(('http://', 'https://')):
                    cursor.execute("""
                        INSERT INTO gallery_images (gallery_id, file_path, width, height)
                        VALUES (%s, %s, %s, %s)
                    """, (gallery_id, url, 300, 300))
                    new_images.append({
                        "file_path": url,
                        "width": 300,
                        "height": 300
                    })
        
        # Обработка файлов
        for image in images:
            if image.content_type and image.content_type.startswith('image/'):
                file_extension = Path(image.filename).suffix if image.filename else '.jpg'
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = UPLOADS_DIR / gallery / unique_filename
                
                async with aiofiles.open(file_path, 'wb') as buffer:
                    content = await image.read()
                    await buffer.write(content)
                
                try:
                    from PIL import Image
                    with Image.open(file_path) as img:
                        width, height = img.size
                except Exception:
                    width, height = 300, 300
                
                db_file_path = f"/static/uploads/{gallery}/{unique_filename}"
                cursor.execute("""
                    INSERT INTO gallery_images (gallery_id, file_path, width, height)
                    VALUES (%s, %s, %s, %s)
                """, (gallery_id, db_file_path, width, height))
                
                new_images.append({
                    "file_path": db_file_path,
                    "width": width,
                    "height": height
                })
        
        conn.commit()
        return {"success": True, "images": new_images}
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {e}")
    finally:
        conn.close()

@app.post("/api/delete-image")
async def delete_image(request: Request):
    """Удалить изображение (только запись из БД, файл остается на диске)"""
    data = await request.json()
    gallery_name = data.get('gallery')
    image_path = data.get('path')
    
    if not all([gallery_name, image_path]):
        raise HTTPException(status_code=400, detail="Не все параметры указаны")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        
        # Удаляем запись из БД (файл остается на диске)
        cursor.execute("""
            DELETE FROM gallery_images 
            WHERE file_path = %s 
            AND gallery_id IN (SELECT id FROM galleries WHERE name = %s)
        """, (image_path, gallery_name))
        
        conn.commit()
        return {"success": True}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления: {e}")
    finally:
        conn.close()

# ==================== API ДЛЯ ЗАКЛАДОК ====================

@app.get("/api/bookmarks")
async def get_bookmarks():
    """Получить все закладки из БД"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.title, b.url, c.name as category, b.created_at
            FROM bookmarks b
            LEFT JOIN categories c ON b.category_id = c.id
            ORDER BY b.created_at DESC
        """)
        bookmarks = cursor.fetchall()
        return bookmarks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения закладок: {e}")
    finally:
        conn.close()

@app.post("/api/bookmarks")
async def create_bookmark(request: Request):
    """Создать новую закладку"""
    data = await request.json()
    title = data.get('title')
    url = data.get('url')
    category = data.get('category')
    
    if not all([title, url, category]):
        raise HTTPException(status_code=400, detail="Все поля обязательны")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        
        # Получаем ID категории
        cursor.execute("SELECT id FROM categories WHERE name = %s", (category,))
        category_result = cursor.fetchone()
        if not category_result:
            raise HTTPException(status_code=400, detail="Категория не найдена")
        
        category_id = category_result['id']
        
        # Создаем закладку
        cursor.execute("""
            INSERT INTO bookmarks (title, url, category_id)
            VALUES (%s, %s, %s) RETURNING id, title, url, created_at
        """, (title, url, category_id))
        
        new_bookmark = cursor.fetchone()
        conn.commit()
        
        # Добавляем имя категории в ответ
        new_bookmark['category'] = category
        return new_bookmark
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания закладки: {e}")
    finally:
        conn.close()

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: int):
    """Удалить закладку"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM bookmarks WHERE id = %s", (bookmark_id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            return {"message": "Bookmark deleted"}
        else:
            raise HTTPException(status_code=404, detail="Закладка не найдена")
            
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка удаления закладки: {e}")
    finally:
        conn.close()

@app.get("/api/categories")
async def get_categories():
    """Получить все категории из БД"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM categories ORDER BY name")
        categories = [row['name'] for row in cursor.fetchall()]
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения категорий: {e}")
    finally:
        conn.close()

# ==================== ЗАПУСК СЕРВЕРА ====================

if __name__ == "__main__":
    import uvicorn
    print("✅ Сервер запущен: http://localhost:3000")
    print("🗄️  База данных: PostgreSQL")
    print("🌤️  Погодный модуль: /weather")
    print("🔑 API ключ погоды:", "Настроен" if os.getenv('OPENWEATHER_API_KEY') else "Не настроен")
    uvicorn.run(app, host="0.0.0.0", port=3000)