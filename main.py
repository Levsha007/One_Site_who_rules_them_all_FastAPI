# main.py - FastAPI сервер для галереи
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

# Инициализация FastAPI
app = FastAPI(title="My Own Site", version="1.0.0")

# Настройка путей
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = STATIC_DIR / "uploads"

# Создаём необходимые папки
for directory in [DATA_DIR, UPLOADS_DIR]:
    directory.mkdir(exist_ok=True)

# Файлы данных
GALLERIES_FILE = DATA_DIR / "galleries.json"
BOOKMARKS_FILE = DATA_DIR / "bookmarks.json"
CATEGORIES_FILE = DATA_DIR / "categories.json"

# Инициализация JSON файлов если их нет
def init_data_files():
    if not GALLERIES_FILE.exists():
        GALLERIES_FILE.write_text('[]', encoding='utf-8')
    
    if not BOOKMARKS_FILE.exists():
        BOOKMARKS_FILE.write_text('[]', encoding='utf-8')
    
    if not CATEGORIES_FILE.exists():
        default_categories = ["Работа", "Образование", "Игры", "Новости", "Развлечения", "Социальные сети", "Спорт", "Технологии"]
        CATEGORIES_FILE.write_text(json.dumps(default_categories, ensure_ascii=False), encoding='utf-8')

init_data_files()

# Монтируем статические файлы
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

# ==================== API ДЛЯ ГАЛЕРЕЙ ====================

@app.get("/api/galleries")
async def get_galleries():
    """Получить все галереи"""
    return read_json(GALLERIES_FILE)

@app.post("/api/create-gallery")
async def create_gallery(request: Request):
    """Создать новую галерею"""
    data = await request.json()
    name = data.get('name')
    
    if not name:
        raise HTTPException(status_code=400, detail="Имя папки обязательно")
    
    galleries = read_json(GALLERIES_FILE)
    
    # Проверяем существование
    if any(g['name'] == name for g in galleries):
        raise HTTPException(status_code=400, detail="Папка с таким именем уже существует")
    
    # Создаём папку
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
    """Загрузить изображения в галерею"""
    galleries = read_json(GALLERIES_FILE)
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Папка не найдена")
    
    new_images = []
    
    # Обработка URL
    if urls and urls.strip():
        url_list = [url.strip() for url in urls.split('\n') if url.strip()]
        for url in url_list:
            try:
                # Простая валидация URL
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
    
    # Обработка файлов
    for image in images:
        if image.content_type and image.content_type.startswith('image/'):
            # Генерируем уникальное имя файла
            file_extension = Path(image.filename).suffix if image.filename else '.jpg'
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = UPLOADS_DIR / gallery / unique_filename
            
            # Сохраняем файл
            async with aiofiles.open(file_path, 'wb') as buffer:
                content = await image.read()
                await buffer.write(content)
            
            # Получаем размеры изображения (упрощённо)
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
    
    # Обновляем галерею
    galleries[gallery_index]['images'] = new_images + galleries[gallery_index]['images']
    
    if write_json(GALLERIES_FILE, galleries):
        return {"success": True, "images": new_images}
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.post("/api/rename")
async def rename_image(request: Request):
    """Переименовать изображение"""
    data = await request.json()
    gallery_name = data.get('gallery')
    old_path = data.get('oldPath')
    new_name = data.get('newName')
    
    if not all([gallery_name, old_path, new_name]):
        raise HTTPException(status_code=400, detail="Не все параметры указаны")
    
    galleries = read_json(GALLERIES_FILE)
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery_name), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Галерея не найдена")
    
    # Ищем изображение
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
    """Удалить изображение"""
    data = await request.json()
    gallery_name = data.get('gallery')
    image_path = data.get('path')
    
    if not all([gallery_name, image_path]):
        raise HTTPException(status_code=400, detail="Не все параметры указаны")
    
    galleries = read_json(GALLERIES_FILE)
    gallery_index = next((i for i, g in enumerate(galleries) if g['name'] == gallery_name), -1)
    
    if gallery_index == -1:
        raise HTTPException(status_code=404, detail="Галерея не найдена")
    
    # Удаляем из массива
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
    """Получить все закладки"""
    return read_json(BOOKMARKS_FILE)

@app.post("/api/bookmarks")
async def create_bookmark(request: Request):
    """Создать новую закладку"""
    data = await request.json()
    title = data.get('title')
    url = data.get('url')
    category = data.get('category')
    
    if not all([title, url, category]):
        raise HTTPException(status_code=400, detail="Все поля обязательны")
    
    bookmarks = read_json(BOOKMARKS_FILE)
    
    new_bookmark = {
        "id": int(uuid.uuid4().int % 1000000),
        "title": title,
        "url": url,
        "category": category,
        "createdAt": datetime.now().isoformat()
    }
    
    bookmarks.append(new_bookmark)
    
    if write_json(BOOKMARKS_FILE, bookmarks):
        return new_bookmark
    else:
        raise HTTPException(status_code=500, detail="Ошибка сохранения")

@app.delete("/api/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: int):
    """Удалить закладку"""
    bookmarks = read_json(BOOKMARKS_FILE)
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
    """Получить все категории"""
    return read_json(CATEGORIES_FILE)

# ==================== ЗАПУСК СЕРВЕРА ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)