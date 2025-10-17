// static/js/weather-app.js - Погодное приложение с картой

class WeatherApp {
    constructor() {
        this.apiKey = null;
        this.currentCity = '';
        this.currentCoords = null;
        this.map = null;
        this.marker = null;
        this.autocompleteTimeout = null;
        this.init();
    }

    async init() {
        await this.loadApiKey();
        this.setupEventListeners();
        this.initMap();
        this.loadLastCity();
        this.setupAutocomplete();
    }

    async loadApiKey() {
        try {
            const response = await fetch('/api/weather-api-key');
            const data = await response.json();
            
            if (data.hasKey) {
                console.log('API ключ настроен на сервере');
            } else {
                throw new Error('API ключ не настроен на сервере');
            }
        } catch (error) {
            console.error('Ошибка загрузки API ключа:', error);
            this.showError('Не удалось загрузить API ключ. Проверьте настройки сервера.');
        }
    }

    setupEventListeners() {
        // Поиск по городу
        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.searchWeather();
        });

        // Поиск по Enter
        document.getElementById('city-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWeather();
            }
        });

        // Геолокация
        document.getElementById('location-btn')?.addEventListener('click', () => {
            this.getWeatherByLocation();
        });

        // Переключение карты
        document.getElementById('map-toggle-btn')?.addEventListener('click', () => {
            this.toggleMap();
        });

        // Закрытие карты
        document.getElementById('close-map-btn')?.addEventListener('click', () => {
            this.hideMap();
        });
    }

    initMap() {
        // Инициализация карты (скрыта по умолчанию)
        this.map = L.map('map', {
            worldCopyJump: false // Отключаем автоматическое перескакивание
        }).setView([55.7558, 37.6173], 3); // Начальный вид - весь мир
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: true // Предотвращаем заворачивание тайлов
        }).addTo(this.map);

        // Обработчик клика по карте
        this.map.on('click', (e) => {
            this.handleMapClick(e.latlng);
        });

        // Ограничиваем область карты разумными пределами
        this.map.setMaxBounds([[-90, -180], [90, 180]]);

        // Создаем кастомную иконку
        this.createCustomIcon();
    }

    createCustomIcon() {
        this.customIcon = L.divIcon({
            className: 'weather-marker',
            html: '<div style="background: var(--accent); border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    }

    createMarker(coords) {
        // Нормализуем координаты
        const normalizedCoords = this.normalizeCoordinates(coords);
        
        // Удаляем старый маркер если есть
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        // Создаем новый маркер с кастомной иконкой
        this.marker = L.marker(normalizedCoords, { 
            icon: this.customIcon,
            draggable: false
        }).addTo(this.map);

        // Центрируем карту на нормализованных координатах
        this.map.setView(normalizedCoords, this.map.getZoom());
    }

    normalizeCoordinates(coords) {
        let lat = coords.lat;
        let lng = coords.lng;
        
        // Нормализуем широту в пределах [-90, 90]
        lat = Math.max(-90, Math.min(90, lat));
        
        // Нормализуем долготу в пределах [-180, 180]
        while (lng < -180) lng += 360;
        while (lng > 180) lng -= 360;
        
        return L.latLng(lat, lng);
    }

    handleMapClick(latlng) {
        // Нормализуем координаты перед использованием
        const normalizedLatLng = this.normalizeCoordinates(latlng);
        
        this.currentCoords = normalizedLatLng;
        this.createMarker(normalizedLatLng);
        
        // Получаем погоду для выбранных координат
        this.getWeatherDataByCoords(normalizedLatLng.lat, normalizedLatLng.lng);
        
        // Показываем уведомление
        this.showToast('Получаем погоду для выбранного местоположения...');
    }

    toggleMap() {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer.style.display === 'none') {
            this.showMap();
        } else {
            this.hideMap();
        }
    }

    showMap() {
        const mapContainer = document.getElementById('map-container');
        mapContainer.style.display = 'block';
        
        // Обновляем размер карты после показа
        setTimeout(() => {
            this.map.invalidateSize();
            // Возвращаемся к разумному виду если карта слишком далеко
            const currentCenter = this.map.getCenter();
            const normalizedCenter = this.normalizeCoordinates(currentCenter);
            if (Math.abs(currentCenter.lng - normalizedCenter.lng) > 1) {
                this.map.setView(normalizedCenter, this.map.getZoom());
            }
        }, 100);
    }

    hideMap() {
        const mapContainer = document.getElementById('map-container');
        mapContainer.style.display = 'none';
    }

    setupAutocomplete() {
        const cityInput = document.getElementById('city-input');
        if (!cityInput) return;

        const autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-container';
        
        cityInput.parentNode.insertBefore(autocompleteContainer, cityInput);
        autocompleteContainer.appendChild(cityInput);
        
        this.autocompleteResults = document.createElement('div');
        this.autocompleteResults.className = 'autocomplete-results';
        this.autocompleteResults.style.display = 'none';
        autocompleteContainer.appendChild(this.autocompleteResults);

        cityInput.addEventListener('input', (e) => {
            this.handleAutocomplete(e.target.value);
        });

        document.addEventListener('click', (e) => {
            if (!autocompleteContainer.contains(e.target)) {
                this.hideAutocomplete();
            }
        });

        cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAutocomplete();
            }
        });
    }

    async handleAutocomplete(query) {
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        clearTimeout(this.autocompleteTimeout);
        
        this.autocompleteTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/cities?search=${encodeURIComponent(query)}`);
                const cities = await response.json();
                
                this.showAutocompleteResults(cities);
            } catch (error) {
                console.error('Autocomplete error:', error);
                this.hideAutocomplete();
            }
        }, 300);
    }

    showAutocompleteResults(cities) {
        if (cities.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteResults.innerHTML = '';
        
        cities.forEach(city => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div>
                    <div class="city-name">${this.escapeHtml(city.name)}</div>
                    <div class="country-name">${this.escapeHtml(city.country)}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                document.getElementById('city-input').value = city.name;
                this.hideAutocomplete();
                this.centerMapOnCity(city.lat, city.lon, city.name);
                this.getWeatherData(city.name);
            });
            
            this.autocompleteResults.appendChild(item);
        });
        
        this.autocompleteResults.style.display = 'block';
    }

    centerMapOnCity(lat, lon, cityName) {
        const coords = this.normalizeCoordinates({ lat: parseFloat(lat), lng: parseFloat(lon) });
        this.map.setView(coords, 10);
        this.createMarker(coords);
        this.showMap();
    }

    hideAutocomplete() {
        if (this.autocompleteResults) {
            this.autocompleteResults.style.display = 'none';
        }
    }

    loadLastCity() {
        const lastCity = localStorage.getItem('lastWeatherCity');
        if (lastCity) {
            document.getElementById('city-input').value = lastCity;
        }
    }

    async searchWeather() {
        const cityInput = document.getElementById('city-input');
        const city = cityInput?.value.trim();
        
        if (!city) {
            this.showError('Пожалуйста, введите название города');
            return;
        }

        this.hideAutocomplete();
        await this.getWeatherData(city);
    }

    async getWeatherByLocation() {
        if (!navigator.geolocation) {
            this.showError('Геолокация не поддерживается вашим браузером');
            return;
        }

        this.showLoading();
        this.hideAutocomplete();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                this.centerMapOnCity(latitude, longitude, 'Ваше местоположение');
                await this.getWeatherDataByCoords(latitude, longitude);
            },
            (error) => {
                this.hideLoading();
                let errorMessage = 'Не удалось получить ваше местоположение. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Разрешение на доступ к местоположению отклонено.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Информация о местоположении недоступна.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Время запроса местоположения истекло.';
                        break;
                    default:
                        errorMessage += 'Неизвестная ошибка.';
                }
                
                this.showError(errorMessage);
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async getWeatherData(city) {
        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.cod && data.cod !== 200) {
                throw new Error(data.message || 'Город не найден');
            }

            this.displayWeatherData(data);
            this.currentCity = city;
            localStorage.setItem('lastWeatherCity', city);

            if (data.coord) {
                this.centerMapOnCity(data.coord.lat, data.coord.lon, data.name);
            }

        } catch (error) {
            console.error('Weather API error:', error);
            this.showError(error.message || 'Не удалось получить данные о погоде');
        } finally {
            this.hideLoading();
        }
    }

    async getWeatherDataByCoords(lat, lon) {
        this.showLoading();
        this.hideAutocomplete();

        try {
            // Нормализуем координаты перед отправкой
            const normalizedCoords = this.normalizeCoordinates({ lat, lng: lon });
            
            const response = await fetch(`/api/weather?lat=${normalizedCoords.lat}&lon=${normalizedCoords.lng}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.cod && data.cod !== 200) {
                throw new Error(data.message || 'Данные не найдены');
            }

            this.displayWeatherData(data);
            this.currentCity = data.name;
            document.getElementById('city-input').value = data.name;
            localStorage.setItem('lastWeatherCity', data.name);

        } catch (error) {
            console.error('Weather API error:', error);
            this.showError(error.message || 'Не удалось получить данные о погоде');
        } finally {
            this.hideLoading();
        }
    }

    displayWeatherData(data) {
        this.displayCurrentWeather(data);
        if (data.coord) {
            this.getForecast(data.coord.lat, data.coord.lon);
        }
    }

    displayCurrentWeather(data) {
        const cityNameElement = document.getElementById('city-name');
        const currentDateElement = document.getElementById('current-date');
        const currentTempElement = document.getElementById('current-temp');
        const feelsLikeElement = document.getElementById('feels-like');
        const weatherDescElement = document.getElementById('weather-description');
        const weatherIconElement = document.getElementById('weather-icon');

        if (cityNameElement) {
            cityNameElement.textContent = `${data.name}${data.sys?.country ? `, ${data.sys.country}` : ''}`;
        }
        if (currentDateElement) {
            currentDateElement.textContent = this.formatDate(new Date());
        }
        if (currentTempElement) {
            currentTempElement.textContent = `${Math.round(data.main.temp)}°`;
        }
        if (feelsLikeElement) {
            feelsLikeElement.textContent = `${Math.round(data.main.feels_like)}°`;
        }
        if (weatherDescElement) {
            weatherDescElement.textContent = data.weather[0].description;
        }
        
        if (weatherIconElement) {
            const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            weatherIconElement.src = iconUrl;
            weatherIconElement.alt = data.weather[0].description;
        }

        const windSpeedElement = document.getElementById('wind-speed');
        const humidityElement = document.getElementById('humidity');
        const pressureElement = document.getElementById('pressure');
        const visibilityElement = document.getElementById('visibility');

        if (windSpeedElement) windSpeedElement.textContent = `${data.wind?.speed || 0} м/с`;
        if (humidityElement) humidityElement.textContent = `${data.main.humidity}%`;
        if (pressureElement) pressureElement.textContent = `${data.main.pressure} hPa`;
        if (visibilityElement) {
            const visibilityKm = (data.visibility / 1000).toFixed(1);
            visibilityElement.textContent = `${visibilityKm} км`;
        }

        document.getElementById('current-weather').style.display = 'block';
    }

    async getForecast(lat, lon) {
        try {
            // Нормализуем координаты для прогноза
            const normalizedCoords = this.normalizeCoordinates({ lat, lng: lon });
            
            const response = await fetch(`/api/forecast?lat=${normalizedCoords.lat}&lon=${normalizedCoords.lng}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.cod && data.cod !== '200') {
                throw new Error(data.message || 'Прогноз не найден');
            }

            this.displayForecast(data);

        } catch (error) {
            console.error('Forecast API error:', error);
            this.showToast('Не удалось загрузить прогноз');
        }
    }

    displayForecast(data) {
        const forecastContainer = document.getElementById('forecast-container');
        if (!forecastContainer) return;

        forecastContainer.innerHTML = '';

        const dailyForecasts = data.list ? data.list.filter((item, index) => index % 8 === 0).slice(0, 5) : [];

        if (dailyForecasts.length === 0) {
            forecastContainer.innerHTML = '<div class="no-forecast">Прогноз недоступен</div>';
            return;
        }

        dailyForecasts.forEach(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';

            dayElement.innerHTML = `
                <div class="forecast-date">${this.formatDay(date)}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" 
                         alt="${this.escapeHtml(forecast.weather[0].description)}">
                </div>
                <div class="forecast-temp">
                    ${Math.round(forecast.main.temp)}°
                </div>
                <div class="forecast-desc">${this.escapeHtml(forecast.weather[0].description)}</div>
                <div class="forecast-details">
                    <span>💧 ${forecast.main.humidity}%</span>
                    <span>💨 ${forecast.wind?.speed || 0} м/с</span>
                </div>
            `;

            forecastContainer.appendChild(dayElement);
        });

        document.getElementById('forecast-section').style.display = 'block';
    }

    formatDate(date) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('ru-RU', options);
    }

    formatDay(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else {
            return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
        }
    }

    showLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        this.hideError();
        
        const currentWeatherElement = document.getElementById('current-weather');
        if (currentWeatherElement) {
            currentWeatherElement.style.display = 'none';
        }
        
        const forecastSection = document.getElementById('forecast-section');
        if (forecastSection) {
            forecastSection.style.display = 'none';
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        this.hideLoading();
        
        const currentWeatherElement = document.getElementById('current-weather');
        if (currentWeatherElement) {
            currentWeatherElement.style.display = 'none';
        }
        
        const forecastSection = document.getElementById('forecast-section');
        if (forecastSection) {
            forecastSection.style.display = 'none';
        }
    }

    hideError() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.weatherApp = new WeatherApp();
});