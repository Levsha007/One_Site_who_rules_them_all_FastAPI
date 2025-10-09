// static/js/quotes.js - Генератор случайных цитат (локальная версия)

class QuotesGenerator {
    constructor() {
        this.currentQuote = null;
        this.allQuotes = { ru: [], en: [] };
        this.categories = { ru: [], en: [] };
        this.authors = { ru: new Set(), en: new Set() };
        
        this.quoteHistory = this.loadFromStorage('quoteHistory') || [];
        this.favoriteQuotes = this.loadFromStorage('favoriteQuotes') || [];
        
        this.autoRefreshInterval = null;
        
        this.initializeElements();
        this.loadQuotesData();
    }

    initializeElements() {
        // Основные элементы
        this.quoteText = document.getElementById('quote-text');
        this.quoteAuthor = document.getElementById('quote-author');
        this.quoteTags = document.getElementById('quote-tags');
        this.quoteMetadata = document.getElementById('quote-metadata');
        
        // Кнопки
        this.newQuoteBtn = document.getElementById('new-quote');
        this.copyQuoteBtn = document.getElementById('copy-quote');
        this.addFavoriteBtn = document.getElementById('add-favorite');
        this.speakQuoteBtn = document.getElementById('speak-quote');
        this.saveImageBtn = document.getElementById('save-image');
        this.clearHistoryBtn = document.getElementById('clear-history');
        
        // Селекторы
        this.categorySelect = document.getElementById('category-select');
        this.languageSelect = document.getElementById('language-select');
        this.authorSelect = document.getElementById('author-select');
        this.autoRefreshSelect = document.getElementById('auto-refresh');
        
        // Списки
        this.historyList = document.getElementById('history-list');
        this.favoritesList = document.getElementById('favorites-list');
        
        this.bindEvents();
    }

    bindEvents() {
        // Кнопки
        this.newQuoteBtn.addEventListener('click', () => this.loadRandomQuote());
        this.copyQuoteBtn.addEventListener('click', () => this.copyQuote());
        this.addFavoriteBtn.addEventListener('click', () => this.addToFavorites());
        this.speakQuoteBtn.addEventListener('click', () => this.speakQuote());
        this.saveImageBtn.addEventListener('click', () => this.saveAsImage());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Селекторы
        this.languageSelect.addEventListener('change', () => this.onLanguageChange());
        this.categorySelect.addEventListener('change', () => this.loadRandomQuote());
        this.authorSelect.addEventListener('change', () => this.loadRandomQuote());
        this.autoRefreshSelect.addEventListener('change', () => this.setupAutoRefresh());
    }

    async loadQuotesData() {
        try {
            const response = await fetch('/api/quotes');
            const data = await response.json();
            
            this.allQuotes = data.quotes;
            this.categories = data.categories;
            
            // Собираем уникальных авторов
            this.collectAuthors();
            
            // Заполняем селекторы
            this.populateCategorySelect();
            this.populateAuthorSelect();
            
            // Загружаем первую цитату
            this.loadRandomQuote();
            this.renderHistory();
            this.renderFavorites();
            
        } catch (error) {
            console.error('Error loading quotes data:', error);
            this.quoteText.textContent = 'Ошибка загрузки цитат';
        }
    }

    collectAuthors() {
        this.authors = { ru: new Set(), en: new Set() };
        
        ['ru', 'en'].forEach(lang => {
            this.allQuotes[lang].forEach(quote => {
                if (quote.author && quote.author.trim()) {
                    this.authors[lang].add(quote.author);
                }
            });
        });
    }

    populateCategorySelect() {
        const language = this.languageSelect.value;
        this.categorySelect.innerHTML = '<option value="">Все категории</option>';
        
        this.categories[language].forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            this.categorySelect.appendChild(option);
        });
    }

    populateAuthorSelect() {
        const language = this.languageSelect.value;
        this.authorSelect.innerHTML = '<option value="">Все авторы</option>';
        
        const sortedAuthors = Array.from(this.authors[language]).sort();
        sortedAuthors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            this.authorSelect.appendChild(option);
        });
    }

    onLanguageChange() {
        this.populateCategorySelect();
        this.populateAuthorSelect();
        this.loadRandomQuote();
    }

    loadRandomQuote() {
        const language = this.languageSelect.value;
        const category = this.categorySelect.value;
        const author = this.authorSelect.value;
        
        let filteredQuotes = this.allQuotes[language];
        
        // Фильтруем по категории
        if (category) {
            filteredQuotes = filteredQuotes.filter(quote => quote.category === category);
        }
        
        // Фильтруем по автору
        if (author) {
            filteredQuotes = filteredQuotes.filter(quote => quote.author === author);
        }
        
        if (filteredQuotes.length === 0) {
            this.showNoQuotesMessage();
            return;
        }
        
        // Выбираем случайную цитату
        const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
        this.currentQuote = {
            ...filteredQuotes[randomIndex],
            language: language
        };
        
        this.displayQuote();
        this.addToHistory();
    }

    showNoQuotesMessage() {
        this.quoteText.textContent = 'Цитаты по выбранным фильтрам не найдены';
        this.quoteAuthor.textContent = '';
        this.quoteTags.innerHTML = '';
        this.quoteMetadata.textContent = '';
        this.currentQuote = null;
    }

    displayQuote() {
        if (!this.currentQuote) return;
        
        this.quoteText.textContent = this.currentQuote.text;
        this.quoteAuthor.textContent = `— ${this.currentQuote.author}`;
        
        // Отображаем теги
        this.quoteTags.innerHTML = '';
        if (this.currentQuote.tags && this.currentQuote.tags.length > 0) {
            this.currentQuote.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'quote-tag';
                tagElement.textContent = tag;
                this.quoteTags.appendChild(tagElement);
            });
        }
        
        // Отображаем метаданные
        this.quoteMetadata.innerHTML = '';
        if (this.currentQuote.metadata) {
            const meta = this.currentQuote.metadata;
            const metaParts = [];
            
            if (meta.origin) metaParts.push(meta.origin);
            if (meta.year) metaParts.push(meta.year);
            if (meta.source) metaParts.push(meta.source);
            
            if (metaParts.length > 0) {
                this.quoteMetadata.textContent = metaParts.join(' • ');
            }
        }
        
        // Анимация появления
        this.quoteText.style.animation = 'none';
        setTimeout(() => {
            this.quoteText.style.animation = 'fadeIn 0.6s ease-out';
        }, 10);
    }

    addToHistory() {
        if (!this.currentQuote) return;
        
        const historyItem = {
            ...this.currentQuote,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        this.quoteHistory.unshift(historyItem);
        
        // Ограничиваем историю 50 элементами
        if (this.quoteHistory.length > 50) {
            this.quoteHistory = this.quoteHistory.slice(0, 50);
        }
        
        this.saveToStorage('quoteHistory', this.quoteHistory);
        this.renderHistory();
    }

    addToFavorites() {
        if (!this.currentQuote) return;
        
        // Проверяем, нет ли уже этой цитаты в избранном
        const isAlreadyFavorite = this.favoriteQuotes.some(fav => 
            fav.text === this.currentQuote.text && fav.author === this.currentQuote.author
        );
        
        if (!isAlreadyFavorite) {
            const favoriteItem = {
                ...this.currentQuote,
                timestamp: new Date().toISOString(),
                id: Date.now()
            };
            
            this.favoriteQuotes.unshift(favoriteItem);
            this.saveToStorage('favoriteQuotes', this.favoriteQuotes);
            this.renderFavorites();
            showToast('Цитата добавлена в избранное!');
        } else {
            showToast('Эта цитата уже в избранном');
        }
    }

    removeFromFavorite(quoteId) {
        this.favoriteQuotes = this.favoriteQuotes.filter(quote => quote.id !== quoteId);
        this.saveToStorage('favoriteQuotes', this.favoriteQuotes);
        this.renderFavorites();
        showToast('Цитата удалена из избранного');
    }

    async copyQuote() {
        if (!this.currentQuote) return;
        
        const textToCopy = `"${this.currentQuote.text}" — ${this.currentQuote.author}`;
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast('Цитата скопирована в буфер обмена!');
        } catch (err) {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Цитата скопирована в буфер обмена!');
        }
    }

    speakQuote() {
        if (!this.currentQuote) return;
        
        if ('speechSynthesis' in window) {
            // Останавливаем предыдущее озвучивание
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance();
            utterance.text = `${this.currentQuote.text} Автор: ${this.currentQuote.author}`;
            utterance.lang = this.currentQuote.language === 'ru' ? 'ru-RU' : 'en-US';
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            speechSynthesis.speak(utterance);
        } else {
            showToast('Озвучивание не поддерживается вашим браузером');
        }
    }

    saveAsImage() {
        showToast('Функция сохранения как изображение в разработке');
        // Здесь можно добавить функциональность создания изображения с цитатой
    }

    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить историю цитат?')) {
            this.quoteHistory = [];
            this.saveToStorage('quoteHistory', this.quoteHistory);
            this.renderHistory();
            showToast('История очищена');
        }
    }

    setupAutoRefresh() {
        const interval = parseInt(this.autoRefreshSelect.value);
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        if (interval > 0) {
            this.autoRefreshInterval = setInterval(() => {
                this.loadRandomQuote();
            }, interval * 1000);
        }
    }

    renderHistory() {
        this.historyList.innerHTML = '';
        
        if (this.quoteHistory.length === 0) {
            this.historyList.innerHTML = '<div class="empty-message">Здесь появятся просмотренные цитаты</div>';
            return;
        }
        
        this.quoteHistory.slice(0, 10).forEach(quote => {
            const historyItem = this.createQuoteElement(quote, 'history');
            this.historyList.appendChild(historyItem);
        });
    }

    renderFavorites() {
        this.favoritesList.innerHTML = '';
        
        if (this.favoriteQuotes.length === 0) {
            this.favoritesList.innerHTML = '<div class="empty-message">Добавьте цитаты в избранное</div>';
            return;
        }
        
        this.favoriteQuotes.forEach(quote => {
            const favoriteItem = this.createQuoteElement(quote, 'favorite');
            this.favoritesList.appendChild(favoriteItem);
        });
    }

    createQuoteElement(quote, type) {
        const element = document.createElement('div');
        element.className = `${type}-item`;
        
        const timeAgo = this.getTimeAgo(quote.timestamp);
        
        element.innerHTML = `
            <div class="${type}-text">"${quote.text}"</div>
            <div class="${type}-author">— ${quote.author}</div>
            <div class="${type}-meta">
                <span>${timeAgo}</span>
                ${quote.language === 'ru' ? '🇷🇺' : '🇺🇸'}
            </div>
            ${type === 'favorite' ? `
                <div class="favorite-actions">
                    <button class="favorite-action-btn copy" data-id="${quote.id}">📋 Копировать</button>
                    <button class="favorite-action-btn remove" data-id="${quote.id}">🗑️ Удалить</button>
                </div>
            ` : ''}
        `;
        
        if (type === 'favorite') {
            const copyBtn = element.querySelector('.favorite-action-btn.copy');
            const removeBtn = element.querySelector('.favorite-action-btn.remove');
            
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const textToCopy = `"${quote.text}" — ${quote.author}`;
                navigator.clipboard.writeText(textToCopy);
                showToast('Цитата скопирована!');
            });
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromFavorite(quote.id);
            });
        }
        
        element.addEventListener('click', () => {
            if (type === 'history') {
                this.currentQuote = quote;
                this.displayQuote();
            }
        });
        
        return element;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        
        if (diffInSeconds < 60) return 'только что';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин назад`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч назад`;
        return `${Math.floor(diffInSeconds / 86400)} дн назад`;
    }

    // Работа с localStorage
    loadFromStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new QuotesGenerator();
});