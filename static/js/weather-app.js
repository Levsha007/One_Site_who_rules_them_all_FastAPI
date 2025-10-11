// static/js/weather.js - Погодное приложение для FastAPI + PostgreSQL

class WeatherApp {
    constructor() {
        this.apiKey = null;
        this.currentCity = '';
        this.autocompleteTimeout = null;
        this.init();
    }

    async init() {
        await this.loadApiKey();
        this.setupEventListeners();
        this.loadLastCity();
        this.setupAutocomplete();
    }

    async loadApiKey() {
        try {
            // Загружаем API ключ с сервера
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
    }

    setupAutocomplete() {
        const cityInput = document.getElementById('city-input');
        if (!cityInput) return;

        const autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-container';
        
        // Обертываем input в контейнер
        cityInput.parentNode.insertBefore(autocompleteContainer, cityInput);
        autocompleteContainer.appendChild(cityInput);
        
        // Создаем контейнер для результатов
        this.autocompleteResults = document.createElement('div');
        this.autocompleteResults.className = 'autocomplete-results';
        this.autocompleteResults.style.display = 'none';
        autocompleteContainer.appendChild(this.autocompleteResults);

        // Обработчик ввода
        cityInput.addEventListener('input', (e) => {
            this.handleAutocomplete(e.target.value);
        });

        // Закрытие автоподстановки при клике вне
        document.addEventListener('click', (e) => {
            if (!autocompleteContainer.contains(e.target)) {
                this.hideAutocomplete();
            }
        });

        // Закрытие при нажатии Escape
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
                this.getWeatherData(city.name);
            });
            
            this.autocompleteResults.appendChild(item);
        });
        
        this.autocompleteResults.style.display = 'block';
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
            const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
            
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
        // Обновляем основную информацию
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
        
        // Устанавливаем иконку
        if (weatherIconElement) {
            const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            weatherIconElement.src = iconUrl;
            weatherIconElement.alt = data.weather[0].description;
        }

        // Обновляем детали
        const windSpeedElement = document.getElementById('wind-speed');
        const humidityElement = document.getElementById('humidity');
        const pressureElement = document.getElementById('pressure');
        const visibilityElement = document.getElementById('visibility');

        if (windSpeedElement) windSpeedElement.textContent = `${data.wind?.speed || 0} м/с`;
        if (humidityElement) humidityElement.textContent = `${data.main.humidity}%`;
        if (pressureElement) pressureElement.textContent = `${data.main.pressure} hPa`;
        if (visibilityElement) {
            visibilityElement.textContent = data.visibility ? `${(data.visibility / 1000).toFixed(1)} км` : 'N/A';
        }

        // Показываем карточку
        const currentWeatherElement = document.getElementById('current-weather');
        if (currentWeatherElement) {
            currentWeatherElement.style.display = 'block';
        }
    }

    async getForecast(lat, lon) {
        try {
            const response = await fetch(`/api/weather/forecast?lat=${lat}&lon=${lon}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.cod && data.cod !== '200') {
                throw new Error(data.message || 'Прогноз не найден');
            }

            this.displayForecast(data);

        } catch (error) {
            console.error('Forecast API error:', error);
            this.showError('Не удалось загрузить прогноз');
        }
    }

    displayForecast(data) {
        const forecastContainer = document.getElementById('forecast-container');
        if (!forecastContainer) return;

        forecastContainer.innerHTML = '';

        // Берем прогноз на 5 дней (каждые 24 часа)
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

        const forecastSection = document.getElementById('forecast-section');
        if (forecastSection) {
            forecastSection.style.display = 'block';
        }
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
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('ru-RU', options);
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

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});