import json
import psycopg2
from datetime import datetime

# Настройки подключения к БД
DB_CONFIG = {
    "host": "localhost",
    "database": "my_app_db", 
    "user": "postgres",
    "password": "ваш_пароль",  # замените на ваш пароль
    "port": "5432"
}

def connect_db():
    """Подключение к базе данных"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Успешное подключение к БД")
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return None

def migrate_categories(conn):
    """Перенос категорий из categories.json"""
    try:
        with open('categories.json', 'r', encoding='utf-8') as f:
            categories = json.load(f)
        
        cursor = conn.cursor()
        for category_name in categories:
            cursor.execute(
                "INSERT INTO categories (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                (category_name,)
            )
        conn.commit()
        print(f"✅ Перенесено {len(categories)} категорий")
    except Exception as e:
        print(f"❌ Ошибка при переносе категорий: {e}")

def migrate_bookmarks(conn):
    """Перенос закладок из bookmarks.json"""
    try:
        with open('bookmarks.json', 'r', encoding='utf-8') as f:
            bookmarks = json.load(f)
        
        cursor = conn.cursor()
        migrated_count = 0
        
        for bookmark in bookmarks:
            # Находим ID категории по имени
            cursor.execute("SELECT id FROM categories WHERE name = %s", (bookmark['category'],))
            category_result = cursor.fetchone()
            category_id = category_result[0] if category_result else None
            
            # Вставляем закладку
            cursor.execute("""
                INSERT INTO bookmarks (title, url, category_id, created_at)
                VALUES (%s, %s, %s, %s)
            """, (
                bookmark['title'],
                bookmark['url'],
                category_id,
                bookmark['createdAt']
            ))
            migrated_count += 1
        
        conn.commit()
        print(f"✅ Перенесено {migrated_count} закладок")
    except Exception as e:
        print(f"❌ Ошибка при переносе закладок: {e}")

def migrate_cities(conn):
    """Перенос городов из cities.json"""
    try:
        with open('cities.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            cities = data.get('cities', [])
        
        cursor = conn.cursor()
        for city in cities:
            cursor.execute("""
                INSERT INTO cities (name, country, lat, lon)
                VALUES (%s, %s, %s, %s)
            """, (
                city['name'],
                city['country'],
                city['lat'],
                city['lon']
            ))
        
        conn.commit()
        print(f"✅ Перенесено {len(cities)} городов")
    except Exception as e:
        print(f"❌ Ошибка при переносе городов: {e}")

def migrate_quotes(conn):
    """Перенос цитат из quotes.json"""
    try:
        with open('quotes.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        cursor = conn.cursor()
        
        # Перенос категорий цитат
        for lang, categories_list in data.get('categories', {}).items():
            for cat in categories_list:
                cursor.execute("""
                    INSERT INTO quote_categories (category_id, name, language)
                    VALUES (%s, %s, %s) 
                    ON CONFLICT (category_id, language) DO NOTHING
                """, (cat['id'], cat['name'], lang))
        
        # Перенос цитат
        for lang, quotes_list in data.get('quotes', {}).items():
            for quote in quotes_list:
                metadata = quote.get('metadata', {})
                cursor.execute("""
                    INSERT INTO quotes (text, author, category_id, language, 
                                      origin, language_original, year, source, tags)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    quote['text'],
                    quote.get('author'),
                    quote.get('category'),
                    lang,
                    metadata.get('origin'),
                    metadata.get('language_original'),
                    metadata.get('year'),
                    metadata.get('source'),
                    quote.get('tags', [])
                ))
        
        conn.commit()
        print("✅ Перенесены цитаты и их категории")
    except Exception as e:
        print(f"❌ Ошибка при переносе цитат: {e}")

def migrate_galleries(conn):
    """Перенос галерей из galleries.json"""
    try:
        with open('galleries.json', 'r', encoding='utf-8') as f:
            galleries = json.load(f)
        
        cursor = conn.cursor()
        
        for gallery in galleries:
            # Вставляем галерею
            cursor.execute("""
                INSERT INTO galleries (name, folder_path)
                VALUES (%s, %s) RETURNING id
            """, (gallery['name'], gallery['folderPath']))
            
            gallery_id = cursor.fetchone()[0]
            
            # Вставляем изображения галереи
            for image in gallery.get('images', []):
                cursor.execute("""
                    INSERT INTO gallery_images (gallery_id, file_path, width, height)
                    VALUES (%s, %s, %s, %s)
                """, (gallery_id, image['path'], image.get('width'), image.get('height')))
        
        conn.commit()
        print(f"✅ Перенесено {len(galleries)} галерей")
    except Exception as e:
        print(f"❌ Ошибка при переносе галерей: {e}")

def main():
    """Основная функция миграции"""
    print("🚀 Начало миграции данных из JSON в PostgreSQL...")
    
    conn = connect_db()
    if not conn:
        return
    
    try:
        # Выполняем миграции в правильном порядке
        migrate_categories(conn)
        migrate_bookmarks(conn)
        migrate_cities(conn)
        migrate_quotes(conn)
        migrate_galleries(conn)
        
        print("\n🎉 Миграция завершена успешно!")
        
    except Exception as e:
        print(f"❌ Общая ошибка миграции: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()
            print("🔌 Подключение к БД закрыто")

if __name__ == "__main__":
    main()