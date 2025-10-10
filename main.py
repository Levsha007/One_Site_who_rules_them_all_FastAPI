# main.py - FastAPI сервер (замена server.js)
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
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

# Загружаем переменные окружения
load_dotenv()

# Инициализация FastAPI
app = FastAPI(title="My Gallery", version="1.0.0")

# Настройка путей (аналог Express)
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = STATIC_DIR / "uploads"

# Создаём необходимые папки (аналог fs.existsSync + fs.mkdirSync)
for directory in [DATA_DIR, UPLOADS_DIR, UPLOADS_DIR / "temp"]:
    directory.mkdir(exist_ok=True)

# Файлы данных (аналог констант в server.js)
GALLERIES_FILE = DATA_DIR / "galleries.json"
BOOKMARKS_FILE = DATA_DIR / "bookmarks.json"
CATEGORIES_FILE = DATA_DIR / "categories.json"
QUOTES_FILE = DATA_DIR / "quotes.json"
CITIES_FILE = DATA_DIR / "cities.json"

# Инициализация JSON файлов если их нет (аналог инициализации в server.js)
def init_data_files():
    # Галереи
    if not GALLERIES_FILE.exists():
        GALLERIES_FILE.write_text('[]', encoding='utf-8')
    
    # Закладки
    if not BOOKMARKS_FILE.exists():
        BOOKMARKS_FILE.write_text('[]', encoding='utf-8')
    
    # Категории
    if not CATEGORIES_FILE.exists():
        default_categories = ["Работа", "Образование", "Игры", "Новости", "Развлечения", "Социальные сети", "Спорт", "Технологии"]
        CATEGORIES_FILE.write_text(json.dumps(default_categories, ensure_ascii=False), encoding='utf-8')
    
    # Цитаты
    if not QUOTES_FILE.exists():
        default_quotes = [
            {"text": "Жизнь - это то, что происходит с тобой, пока ты строишь другие планы.", "author": "Джон Леннон"},
            {"text": "Единственный способ делать великие дела - это любить то, что ты делаешь.", "author": "Стив Джобс"}
        ]
        QUOTES_FILE.write_text(json.dumps(default_quotes, ensure_ascii=False, indent=2), encoding='utf-8')
    
    # Города для автоподстановки
    if not CITIES_FILE.exists():
        # Создаем базовый файл с популярными городами
        basic_cities = {
            "cities": [
                {"name": "Москва", "country": "Россия", "lat": 55.7558, "lon": 37.6173},
                {"name": "Санкт-Петербург", "country": "Россия", "lat": 59.9343, "lon": 30.3351},
                {"name": "Новосибирск", "country": "Россия", "lat": 55.0084, "lon": 82.9357},
                {"name": "Екатеринбург", "country": "Россия", "lat": 56.8389, "lon": 60.6057},
                {"name": "Казань", "country": "Россия", "lat": 55.8304, "lon": 49.0661},
                {"name": "Нижний Новгород", "country": "Россия", "lat": 56.2965, "lon": 43.9361},
                {"name": "Челябинск", "country": "Россия", "lat": 55.1644, "lon": 61.4368},
                {"name": "Самара", "country": "Россия", "lat": 53.2415, "lon": 50.2212},
                {"name": "Омск", "country": "Россия", "lat": 54.9885, "lon": 73.3242},
                {"name": "Ростов-на-Дону", "country": "Россия", "lat": 47.2357, "lon": 39.7015},
                {"name": "Уфа", "country": "Россия", "lat": 54.7388, "lon": 55.9721},
                {"name": "Красноярск", "country": "Россия", "lat": 56.0153, "lon": 92.8932},
                {"name": "Воронеж", "country": "Россия", "lat": 51.6755, "lon": 39.2089},
                {"name": "Пермь", "country": "Россия", "lat": 58.0105, "lon": 56.2502},
                {"name": "Волгоград", "country": "Россия", "lat": 48.708, "lon": 44.5133},
                {"name": "Киев", "country": "Украина", "lat": 50.4501, "lon": 30.5234},
                {"name": "Минск", "country": "Беларусь", "lat": 53.9045, "lon": 27.5615},
                {"name": "Астана", "country": "Казахстан", "lat": 51.1694, "lon": 71.4491},
                {"name": "Алматы", "country": "Казахстан", "lat": 43.2383, "lon": 76.9455},
                {"name": "Лондон", "country": "Великобритания", "lat": 51.5074, "lon": -0.1278},
                {"name": "Париж", "country": "Франция", "lat": 48.8566, "lon": 2.3522},
                {"name": "Берлин", "country": "Германия", "lat": 52.52, "lon": 13.405},
                {"name": "Мадрид", "country": "Испания", "lat": 40.4168, "lon": -3.7038},
                {"name": "Рим", "country": "Италия", "lat": 41.9028, "lon": 12.4964},
                {"name": "Прага", "country": "Чехия", "lat": 50.0755, "lon": 14.4378},
                {"name": "Вена", "country": "Австрия", "lat": 48.2082, "lon": 16.3738},
                {"name": "Амстердам", "country": "Нидерланды", "lat": 52.3676, "lon": 4.9041},
                {"name": "Брюссель", "country": "Бельгия", "lat": 50.8503, "lon": 4.3517},
                {"name": "Стамбул", "country": "Турция", "lat": 41.0082, "lon": 28.9784},
                {"name": "Дубай", "country": "ОАЭ", "lat": 25.2048, "lon": 55.2708},
                {"name": "Токио", "country": "Япония", "lat": 35.6762, "lon": 139.6503},
                {"name": "Пекин", "country": "Китай", "lat": 39.9042, "lon": 116.4074},
                {"name": "Сеул", "country": "Корея", "lat": 37.5665, "lon": 126.978},
                {"name": "Нью-Йорк", "country": "США", "lat": 40.7128, "lon": -74.006},
                {"name": "Лос-Анджелес", "country": "США", "lat": 34.0522, "lon": -118.2437},
                {"name": "Чикаго", "country": "США", "lat": 41.8781, "lon": -87.6298},
                {"name": "Торонто", "country": "Канада", "lat": 43.6532, "lon": -79.3832},
                {"name": "Сидней", "country": "Австралия", "lat": -33.8688, "lon": 151.2093}
            ]
        }
        CITIES_FILE.write_text(json.dumps(basic_cities, ensure_ascii=False, indent=2), encoding='utf-8')

init_data_files()

# Загружаем данные (аналог let galleries = JSON.parse(...))
def load_galleries():
    return read_json(GALLERIES_FILE)

def load_bookmarks():
    return read_json(BOOKMARKS_FILE)

def load_categories():
    return read_json(CATEGORIES_FILE)

def load_quotes():
    return read_json(QUOTES_FILE)

def load_cities():
    return read_json(CITIES_FILE)

# Монтируем статические файлы (аналог app.use(express.static('public')))
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Настраиваем шаблоны
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Вспомогательные функции для работы с JSON
def read_json(file_path: Path):
    try:
        return json.loads(file_path.read_text(encoding='utf-8'))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return []

def write_json(file_path: Path, data):
    try:
        file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

# ==================== РОУТЫ ДЛЯ СТРАНИЦ (аналог app.get) ====================

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
    """Получить все цитаты из JSON файла"""
    return load_quotes()

# ==================== API ДЛЯ ПОГОДЫ ====================

@app.get("/api/weather")
async def get_weather(city: str = None, lat: float = None, lon: float = None):
    """Получить текущую погоду"""
    api_key = os.getenv('OPENWEATHER_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="API ключ не настроен")
    
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Укажите город или координаты")
    
    # Формируем URL для API
    if city:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=ru"
    else:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=ru"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url)
            weather_data = response.json()
            
            # Проверяем на ошибки от OpenWeatherMap
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
            
            # Проверяем на ошибки от OpenWeatherMap
            if forecast_data.get('cod') != '200':
                raise HTTPException(status_code=404, detail=forecast_data.get('message', 'Прогноз не найден'))
                
            return forecast_data
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка подключения к API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка API: {str(e)}")

@app.get("/api/weather-api-key")
async def get_weather_api_key():
    """Получить статус API ключа (без самого ключа)"""
    api_key = os.getenv('OPENWEATHER_API_KEY')
    return {"hasKey": bool(api_key), "apiKey": "configured" if api_key else None}

@app.get("/api/cities")
async def get_cities(search: str = None):
    """Получить города для автоподстановки"""
    cities_data = load_cities()
    cities = cities_data.get('cities', [])
    
    if search:
        search_lower = search.lower()
        cities = [city for city in cities 
                 if search_lower in city['name'].lower() 
                 or search_lower in city['country'].lower()]
    
    return cities[:20]  # Ограничиваем количество результатов

# ==================== API ДЛЯ ГАЛЕРЕЙ ====================

@app.get("/api/galleries")
async def get_galleries():
    """Получить все галереи (аналог /galleries)"""
    galleries = load_galleries()
    
    # Исправляем пути для загруженных файлов
    for gallery in galleries:
        for image in gallery.get('images', []):
            if not image.get('isExternal', False) and image['path'].startswith('/uploads/'):
                # Меняем /uploads/ на /static/uploads/
                image['path'] = image['path'].replace('/uploads/', '/static/uploads/')
    
    return galleries

@app.post("/api/create-gallery")
async def create_gallery(request: Request):
    """Создать новую галерею (аналог /create-gallery)"""
    data = await request.json()
    name = data.get('name')
    
    if not name:
        raise HTTPException(status_code=400, detail="Имя папки обязательно")
    
    galleries = load_galleries()
    
    # Проверяем существование (аналог galleries.some(g => g.name === name))
    if any(g['name'] == name for g in galleries):
        raise HTTPException(status_code=400, detail="Папка с таким именем уже существует")
    
    # Создаём папку (аналог fs.mkdirSync)
    gallery_path = UPLOADS_DIR / name
    gallery_path.mkdir(exist_ok=True)
    
    # Добавляем в данные
    new_gallery = {
        "name": name,
        "folderPath": f"uploads/{name}",
        "images": []
    }
    galleries.append(new_gallery)
    
    if write_json(GALLERIES_FILE, galleries):
        return {"success": True, "name": name}
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.post("/api/upload")
async def upload_images(
    gallery: str = Form(...),
    urls: Optional[str] = Form(None),
    images: List[UploadFile] = File([])
):
    """Загрузить изображения в галерею (аналог /upload с multer)"""
    galleries = load_galleries()
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Папка не найдена")
    
    new_images = []
    
    # Обработка URL (аналог обработки urls в server.js)
    if urls and urls.strip():
        url_list = [url.strip() for url in urls.split('\n') if url.strip()]
        for url in url_list:
            try:
                # Простая валидация URL (аналог new URL(url))
                if url.startswith(('http://', 'https://')):
                    new_images.append({
                        "path": url,
                        "name": "",
                        "isExternal": True,
                        "width": 300,
                        "height": 300
                    })
            except Exception:
                continue
    
    # Обработка файлов (аналог обработки files в server.js)
    for image in images:
        # Проверка типа файла (аналог fileFilter в multer)
        if image.content_type and image.content_type.startswith('image/'):
            # Генерируем уникальное имя файла (аналог логики с counter)
            file_extension = Path(image.filename).suffix if image.filename else '.jpg'
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOADS_DIR / gallery / unique_filename
            
            # Сохраняем файл (аналог fs.renameSync)
            async with aiofiles.open(file_path, 'wb') as buffer:
                content = await image.read()
                await buffer.write(content)
            
            # Получаем размеры изображения (аналог sharp)
            try:
                from PIL import Image
                with Image.open(file_path) as img:
                    width, height = img.size
            except Exception:
                width, height = 300, 300
            
            new_images.append({
                "path": f"/static/uploads/{gallery}/{unique_filename}",
                "name": "",
                "width": width,
                "height": height
            })
    
    # Обновляем галерею (аналог galleries[galleryIndex].images.unshift(...newImages))
    galleries[gallery_index]['images'] = new_images + galleries[gallery_index]['images']
    
    if write_json(GALLERIES_FILE, galleries):
        return {"success": True, "images": new_images}
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.post("/api/rename")
async def rename_image(request: Request):
    """Переименовать изображение (аналог /rename)"""
    data = await request.json()
    gallery_name = data.get('gallery')
    old_path = data.get('oldPath')
    new_name = data.get('newName')
    
    if not all([gallery_name, old_path, new_name]):
        raise HTTPException(status_code=400, detail="Не все параметры указаны")
    
    galleries = load_galleries()
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery_name), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Галерея не найдена")
    
    # Ищем изображение (аналог galleries[galleryIndex].images.find)
    image_index = next((i for i, img in enumerate(galleries[gallery_index]['images']) 
                       if img['path'] == old_path), -1)
    
    if image_index == -1:
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    
    # Обновляем имя
    galleries[gallery_index]['images'][image_index]['name'] = new_name
    
    if write_json(GALLERIES_FILE, galleries):
        return {"success": True}
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.post("/api/delete-image")
async def delete_image(request: Request):
    """Удалить изображение (аналог /delete-image)"""
    data = await request.json()
    gallery_name = data.get('gallery')
    image_path = data.get('path')
    
    if not all([gallery_name, image_path]):
        raise HTTPException(status_code=400, detail="Не все параметры указаны")
    
    galleries = load_galleries()
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery_name), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Галерея не найдена")
    
    # Удаляем из массива (аналог splice)
    galleries[gallery_index]['images'] = [
        img for img in galleries[gallery_index]['images'] 
        if img['path'] != image_path
    ]
    
    if write_json(GALLERIES_FILE, galleries):
        return {"success": True}
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

# ==================== API ДЛЯ ЗАКЛАДОК ====================

@app.get("/api/bookmarks")
async def get_bookmarks():
    """Получить все закладки (аналог /bookmarks)"""
    return load_bookmarks()

@app.post("/api/bookmarks")
async def create_bookmark(request: Request):
    """Создать новую закладку (аналог POST /bookmarks)"""
    data = await request.json()
    title = data.get('title')
    url = data.get('url')
    category = data.get('category')
    
    if not all([title, url, category]):
        raise HTTPException(status_code=400, detail="Все поля обязательны")
    
    bookmarks = load_bookmarks()
    
    new_bookmark = {
        "id": int(uuid.uuid4().int % 1000000),  # Аналог Date.now() но уникальнее
        "title": title,
        "url": url,
        "category": category,
        "createdAt": datetime.now().isoformat()  # Аналог new Date().toISOString()
    }
    
    bookmarks.append(new_bookmark)
    
    if write_json(BOOKMARKS_FILE, bookmarks):
        return new_bookmark
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: int):
    """Удалить закладку (аналог DELETE /bookmarks/:id)"""
    bookmarks = load_bookmarks()
    initial_length = len(bookmarks)
    
    bookmarks = [b for b in bookmarks if b['id'] != bookmark_id]
    
    if len(bookmarks) < initial_length:
        if write_json(BOOKMARKS_FILE, bookmarks):
            return {"message": "Bookmark deleted"}
        else:
            raise HTTPException(status_code=500, detail="Ошибка сохранения")
    else:
        raise HTTPException(status_code=404, detail="Закладка не найдена")

@app.get("/api/categories")
async def get_categories():
    """Получить все категории (аналог /categories)"""
    return load_categories()

# ==================== ЗАПУСК СЕРВЕРА ====================

if __name__ == "__main__":
    import uvicorn
    print("✅ Сервер запущен: http://localhost:3000")  # Аналог console.log
    print("🌤️  Погодный модуль: /weather")
    print("🔑 API ключ погоды:", "Настроен" if os.getenv('OPENWEATHER_API_KEY') else "Не настроен")
    print("🏙️  База городов:", f"{len(load_cities().get('cities', []))} городов")
    uvicorn.run(app, host="0.0.0.0", port=3000)