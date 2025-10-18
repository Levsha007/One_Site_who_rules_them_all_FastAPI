class RoutesApp {
    constructor() {
        this.map = null;
        this.routePoints = [];
        this.routeSegments = [];
        this.savedRoutes = [];
        this.currentTransport = 'driving';
        this.measureMode = false;
        this.measurePoints = [];
        this.measureLine = null;
        this.elevationData = [];
        this.routeGeometry = [];
        this.init();
    }

    async init() {
        await this.loadSavedRoutes();
        this.initMap();
        this.setupEventListeners();
        this.updateSavedRoutesList();
        this.updateUI();
    }

    initMap() {
        this.map = L.map('routes-map', {
            worldCopyJump: false,
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0
        }).setView([55.7558, 37.6173], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            noWrap: true
        }).addTo(this.map);

        this.routeLayer = L.layerGroup().addTo(this.map);
        this.pointsLayer = L.layerGroup().addTo(this.map);
        this.measureLayer = L.layerGroup().addTo(this.map);

        this.map.on('click', (e) => {
            if (this.measureMode) {
                this.handleMeasureClick(e.latlng);
            } else {
                this.addRoutePoint(e.latlng, `Точка ${this.routePoints.length + 1}`);
            }
        });
    }

    setupEventListeners() {
        document.getElementById('search-submit-btn').addEventListener('click', () => {
            this.handleSearch();
        });

        document.getElementById('route-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        document.getElementById('measure-btn').addEventListener('click', () => {
            this.toggleMeasureMode();
        });

        document.getElementById('clear-measure-btn').addEventListener('click', () => {
            this.clearMeasurement();
        });

        document.getElementById('fit-bounds-btn').addEventListener('click', () => {
            this.fitRouteBounds();
        });

        document.getElementById('clear-route-btn').addEventListener('click', () => {
            this.clearRoute();
        });

        document.getElementById('save-route-btn').addEventListener('click', () => {
            this.saveRoute();
        });

        document.getElementById('export-gpx-btn').addEventListener('click', () => {
            this.exportGPX();
        });

        document.getElementById('transport-mode').addEventListener('change', (e) => {
            this.currentTransport = e.target.value;
        });
    }

    async handleSearch() {
        const query = document.getElementById('route-search').value.trim();
        if (!query) return;

        try {
            // Проверяем, является ли ввод координатами
            const coordMatch = query.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[2]);
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    const latlng = L.latLng(lat, lng);
                    this.map.setView(latlng, 13);
                    this.showToast(`Координаты: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                    return;
                }
            }

            // Поиск через Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await response.json();
            
            if (results && results.length > 0) {
                const result = results[0];
                const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                
                this.map.setView(latlng, 13);
                this.showToast(`Найдено: ${result.display_name}`);
            } else {
                this.showToast('Место не найдено');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Ошибка поиска');
        }
    }

    async addRoutePoint(latlng, name = '') {
        // Проверяем, не находится ли точка в море
        try {
            const response = await fetch(`https://api.onwater.io/api/v1/results/${latlng.lat},${latlng.lng}?access_token=YOUR_API_KEY`);
            const data = await response.json();
            if (data.water) {
                this.showToast('❌ Нельзя добавить точку в море/океане');
                return;
            }
        } catch (error) {
            // Если сервис недоступен, пропускаем проверку
            console.log('Water check service unavailable');
        }

        const point = {
            id: Date.now() + Math.random(),
            latlng: latlng,
            name: name || `Точка ${this.routePoints.length + 1}`,
            marker: null
        };

        // Создаем маркер как красную точку
        point.marker = L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#dc2626',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(this.pointsLayer);

        point.marker.bindTooltip(name, { permanent: false, direction: 'top' });

        this.routePoints.push(point);
        this.updatePointsList();
        
        // Инкрементальное построение маршрута
        if (this.routePoints.length >= 2) {
            await this.addRouteSegment(this.routePoints.length - 2, this.routePoints.length - 1);
        }
        
        this.updateUI();
    }

    async addRouteSegment(startIndex, endIndex) {
        const start = this.routePoints[startIndex];
        const end = this.routePoints[endIndex];
        
        try {
            const route = await this.getOSRMRoute(start.latlng, end.latlng, this.currentTransport);
            if (route && route.geometry) {
                const segment = {
                    start: start,
                    end: end,
                    transport: this.currentTransport,
                    geometry: route.geometry,
                    distance: route.distance,
                    duration: route.duration,
                    polyline: null
                };
                
                this.routeSegments.push(segment);
                this.drawRouteSegment(segment);
                
                // Обновляем общую геометрию маршрута
                this.updateRouteGeometry();
                await this.calculateElevation();
                this.updateRouteInfo();
                this.updateTransportSegments();
            } else {
                this.showToast('❌ Не удалось построить маршрут для выбранного типа транспорта');
            }
        } catch (error) {
            console.error('Segment calculation error:', error);
            this.showToast('❌ Ошибка построения сегмента маршрута');
        }
    }

    async getOSRMRoute(start, end, profile) {
        const coords = `${start.lng},${start.lat};${end.lng},${end.lat}`;
        const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    geometry: route.geometry,
                    distance: route.distance,
                    duration: route.duration
                };
            } else {
                // Если OSRM не может построить маршрут, возвращаем null
                return null;
            }
        } catch (error) {
            console.error('OSRM API error:', error);
            return null;
        }
    }

    updateRouteGeometry() {
        this.routeGeometry = [];
        this.routeSegments.forEach(segment => {
            if (segment.geometry && segment.geometry.coordinates) {
                this.routeGeometry.push(...segment.geometry.coordinates);
            }
        });
    }

    drawRouteSegment(segment) {
        const color = this.getTransportColor(segment.transport);
        const style = this.getTransportStyle(segment.transport);
        
        // Удаляем старый сегмент если он существует
        if (segment.polyline) {
            this.routeLayer.removeLayer(segment.polyline);
        }
        
        segment.polyline = L.geoJSON(segment.geometry, {
            style: {
                color: color,
                weight: style.weight,
                opacity: 0.8,
                dashArray: style.dashArray
            },
            className: `route-segment-${segment.transport}`
        }).addTo(this.routeLayer);

        // Добавляем popup с информацией о сегменте
        segment.polyline.bindPopup(`
            <div class="segment-popup">
                <strong>Транспорт:</strong> ${this.getTransportName(segment.transport)}<br>
                <strong>Расстояние:</strong> ${this.formatDistance(segment.distance)}<br>
                <strong>Время:</strong> ${this.formatDuration(segment.duration)}
            </div>
        `);
    }

    getTransportColor(transport) {
        const colors = {
            driving: '#3b82f6',
            walking: '#10b981',
            cycling: '#f59e0b',
            public: '#8b5cf6'
        };
        return colors[transport] || '#3b82f6';
    }

    getTransportName(transport) {
        const names = {
            driving: '🚗 Автомобиль',
            walking: '🚶 Пешком',
            cycling: '🚴 Велосипед',
            public: '🚌 Общественный транспорт'
        };
        return names[transport] || 'Неизвестно';
    }

    getTransportStyle(transport) {
        const styles = {
            driving: { weight: 4, dashArray: null },
            walking: { weight: 3, dashArray: '5, 5' },
            cycling: { weight: 4, dashArray: null },
            public: { weight: 4, dashArray: '8, 4' }
        };
        return styles[transport] || { weight: 4, dashArray: null };
    }

    updatePointsList() {
        const container = document.getElementById('route-points-list');
        
        if (this.routePoints.length === 0) {
            container.innerHTML = '<div class="empty-state">Добавьте точки на карту</div>';
            return;
        }

        container.innerHTML = '';
        
        this.routePoints.forEach((point, index) => {
            const pointElement = document.createElement('div');
            pointElement.className = 'route-point';
            pointElement.innerHTML = `
                <div class="point-number">${index + 1}</div>
                <div class="point-info">
                    <div class="point-name">${this.escapeHtml(point.name)}</div>
                    <div class="point-coords">${point.latlng.lat.toFixed(4)}, ${point.latlng.lng.toFixed(4)}</div>
                </div>
                <div class="point-actions">
                    <button class="point-action-btn" onclick="routesApp.editPointAtIndex(${index})">✏️</button>
                    <button class="point-action-btn" onclick="routesApp.removePoint(${index})">🗑️</button>
                </div>
            `;
            container.appendChild(pointElement);
        });
    }

    updateTransportSegments() {
        const container = document.getElementById('transport-segments');
        container.innerHTML = '';

        // Группируем сегменты по типу транспорта
        const transportGroups = {};
        this.routeSegments.forEach(segment => {
            if (!transportGroups[segment.transport]) {
                transportGroups[segment.transport] = {
                    distance: 0,
                    duration: 0,
                    count: 0
                };
            }
            transportGroups[segment.transport].distance += segment.distance;
            transportGroups[segment.transport].duration += segment.duration;
            transportGroups[segment.transport].count += 1;
        });

        // Добавляем сегменты в интерфейс
        Object.entries(transportGroups).forEach(([transport, data]) => {
            const segmentElement = document.createElement('div');
            segmentElement.className = 'transport-segment';
            segmentElement.innerHTML = `
                <div class="transport-segment-color" style="background-color: ${this.getTransportColor(transport)}"></div>
                <div class="transport-segment-info">
                    <strong>${this.getTransportName(transport)}</strong>
                    <div>${this.formatDistance(data.distance)} • ${this.formatDuration(data.duration)}</div>
                </div>
            `;
            container.appendChild(segmentElement);
        });
    }

    removePoint(index) {
        const point = this.routePoints[index];
        
        if (point.marker) {
            this.pointsLayer.removeLayer(point.marker);
        }
        
        this.routePoints.splice(index, 1);
        
        // Удаляем связанные сегменты и перестраиваем маршрут
        this.routeSegments = this.routeSegments.filter(segment => 
            segment.start !== point && segment.end !== point
        );
        
        this.routeLayer.clearLayers();
        
        // Перерисовываем оставшиеся сегменты
        this.routeSegments.forEach(segment => {
            this.drawRouteSegment(segment);
        });
        
        this.updateMarkersNumbers();
        
        if (this.routePoints.length >= 2) {
            this.updateRouteGeometry();
            this.calculateElevation();
            this.updateTransportSegments();
        } else {
            this.clearElevationData();
            document.getElementById('transport-segments').innerHTML = '';
        }
        
        this.updatePointsList();
        this.updateUI();
    }

    updateMarkersNumbers() {
        this.routePoints.forEach((point, index) => {
            if (point.marker) {
                point.marker.bindTooltip(`Точка ${index + 1}`, { permanent: false, direction: 'top' });
            }
        });
    }

    async calculateElevation() {
        if (this.routeGeometry.length < 2) {
            this.clearElevationData();
            return;
        }

        try {
            // Берем только каждую 5-ю точку для оптимизации
            const sampledCoords = [];
            for (let i = 0; i < this.routeGeometry.length; i += 5) {
                sampledCoords.push(this.routeGeometry[i]);
            }

            if (sampledCoords.length === 0) return;

            const locations = sampledCoords.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
            }));

            const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ locations: locations })
            });

            const data = await response.json();
            this.elevationData = data.results || [];
            this.updateElevationProfile();
            
        } catch (error) {
            console.error('Elevation API error:', error);
            this.elevationData = [];
            this.updateElevationProfile();
        }
    }

    updateElevationProfile() {
        const canvas = document.getElementById('elevation-chart');
        const ctx = canvas.getContext('2d');
        
        if (this.elevationData.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            document.getElementById('elevation-profile').style.display = 'none';
            return;
        }

        const elevations = this.elevationData.map(point => point.elevation);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const range = Math.max(maxElevation - minElevation, 10); // Минимальный диапазон 10м

        // Рассчитываем набор и спуск высоты
        let gain = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) gain += diff;
        }

        // Обновляем статистику
        document.getElementById('max-elevation').textContent = `${Math.round(maxElevation)} м`;
        document.getElementById('min-elevation').textContent = `${Math.round(minElevation)} м`;
        document.getElementById('elevation-gain').textContent = `${Math.round(gain)} м`;

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем фон
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Рисуем график высот
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        
        elevations.forEach((elevation, index) => {
            const x = (index / (elevations.length - 1)) * canvas.width;
            const y = canvas.height - ((elevation - minElevation) / range) * (canvas.height - 10) - 5;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        // Замыкаем область под графиком
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        document.getElementById('elevation-profile').style.display = 'block';
    }

    clearElevationData() {
        this.elevationData = [];
        const canvas = document.getElementById('elevation-chart');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('elevation-profile').style.display = 'none';
        document.getElementById('transport-segments').innerHTML = '';
    }

    updateRouteInfo() {
        const totalDistance = this.routeSegments.reduce((sum, segment) => sum + segment.distance, 0);
        const totalDuration = this.routeSegments.reduce((sum, segment) => sum + segment.duration, 0);
        
        document.getElementById('total-distance').textContent = this.formatDistance(totalDistance);
        document.getElementById('total-duration').textContent = this.formatDuration(totalDuration);
        document.getElementById('points-count').textContent = this.routePoints.length;
        
        document.getElementById('route-info').style.display = 'block';
    }

    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} м`;
        } else {
            return `${(meters / 1000).toFixed(1)} км`;
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours} ч ${minutes} мин`;
        } else {
            return `${minutes} мин`;
        }
    }

    clearRoute() {
        // Полностью очищаем все данные маршрута
        this.routePoints.forEach(point => {
            if (point.marker) {
                this.pointsLayer.removeLayer(point.marker);
            }
        });
        
        this.routePoints = [];
        this.routeSegments = [];
        this.routeGeometry = [];
        this.routeLayer.clearLayers();
        this.clearElevationData();
        this.updatePointsList();
        this.updateUI();
        document.getElementById('route-info').style.display = 'none';
        document.getElementById('elevation-profile').style.display = 'none';
    }

    fitRouteBounds() {
        if (this.routePoints.length === 0) return;
        
        const group = new L.featureGroup(
            this.routePoints.map(point => point.marker).filter(marker => marker)
        );
        
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    toggleMeasureMode() {
        this.measureMode = !this.measureMode;
        this.clearMeasurement();
        
        const measureBtn = document.getElementById('measure-btn');
        if (this.measureMode) {
            measureBtn.classList.add('active');
            this.map.getContainer().style.cursor = 'crosshair';
            this.showToast('Режим измерения: кликните на карту чтобы начать измерение');
        } else {
            measureBtn.classList.remove('active');
            this.map.getContainer().style.cursor = '';
        }
    }

    handleMeasureClick(latlng) {
        this.measurePoints.push(latlng);
        
        L.circleMarker(latlng, {
            radius: 4,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(this.measureLayer);

        if (this.measurePoints.length >= 2) {
            this.updateMeasureLine();
        }
        
        document.getElementById('measure-info').style.display = 'flex';
    }

    updateMeasureLine() {
        if (this.measureLine) {
            this.measureLayer.removeLayer(this.measureLine);
        }

        this.measureLine = L.polyline(this.measurePoints, {
            color: '#3b82f6',
            weight: 3,
            dashArray: '5, 5',
            opacity: 0.8
        }).addTo(this.measureLayer);

        const distance = this.calculateMeasureDistance();
        document.getElementById('measure-distance').textContent = this.formatDistance(distance);
    }

    calculateMeasureDistance() {
        let totalDistance = 0;
        
        for (let i = 1; i < this.measurePoints.length; i++) {
            totalDistance += this.measurePoints[i-1].distanceTo(this.measurePoints[i]);
        }
        
        return totalDistance;
    }

    clearMeasurement() {
        this.measurePoints = [];
        this.measureLayer.clearLayers();
        document.getElementById('measure-info').style.display = 'none';
    }

    saveRoute() {
        if (this.routePoints.length < 2) {
            this.showToast('Добавьте хотя бы 2 точки для сохранения маршрута');
            return;
        }
        
        const nameInput = document.getElementById('route-name-input');
        const routeName = nameInput.value.trim();
        if (!routeName) {
            this.showToast('Введите название маршрута');
            return;
        }
        
        const route = {
            id: Date.now(),
            name: routeName,
            points: this.routePoints.map(point => ({
                lat: point.latlng.lat,
                lng: point.latlng.lng,
                name: point.name
            })),
            segments: this.routeSegments.map(segment => ({
                transport: segment.transport,
                geometry: segment.geometry,
                distance: segment.distance,
                duration: segment.duration
            })),
            createdAt: new Date().toISOString(),
            totalDistance: this.routeSegments.reduce((sum, s) => sum + s.distance, 0),
            totalDuration: this.routeSegments.reduce((sum, s) => sum + s.duration, 0)
        };
        
        this.savedRoutes.unshift(route);
        this.saveRoutesToStorage();
        this.updateSavedRoutesList();
        
        nameInput.value = '';
        this.showToast(`Маршрут "${routeName}" сохранен`);
    }

    loadSavedRoutes() {
        try {
            const saved = localStorage.getItem('savedRoutes');
            if (saved) {
                this.savedRoutes = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading saved routes:', error);
            this.savedRoutes = [];
        }
    }

    saveRoutesToStorage() {
        try {
            localStorage.setItem('savedRoutes', JSON.stringify(this.savedRoutes));
        } catch (error) {
            console.error('Error saving routes:', error);
        }
    }

    updateSavedRoutesList() {
        const container = document.getElementById('saved-routes-list');
        
        if (this.savedRoutes.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет сохраненных маршрутов</div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.savedRoutes.forEach(route => {
            const routeElement = document.createElement('div');
            routeElement.className = 'saved-route-item';
            routeElement.innerHTML = `
                <div class="saved-route-info">
                    <div class="saved-route-name">${this.escapeHtml(route.name)}</div>
                    <div class="saved-route-meta">
                        ${this.formatDistance(route.totalDistance)} • 
                        ${this.formatDuration(route.totalDuration)} • 
                        ${new Date(route.createdAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="saved-route-actions">
                    <button class="point-action-btn" onclick="routesApp.loadRoute('${route.id}')">📁</button>
                    <button class="point-action-btn" onclick="routesApp.deleteSavedRoute('${route.id}')">🗑️</button>
                </div>
            `;
            container.appendChild(routeElement);
        });
    }

    loadRoute(routeId) {
        const route = this.savedRoutes.find(r => r.id == routeId);
        if (!route) return;
        
        this.clearRoute();
        
        // Восстанавливаем точки
        route.points.forEach(pointData => {
            const latlng = L.latLng(pointData.lat, pointData.lng);
            this.addRoutePoint(latlng, pointData.name);
        });
        
        this.showToast(`Маршрут "${route.name}" загружен`);
    }

    deleteSavedRoute(routeId) {
        this.savedRoutes = this.savedRoutes.filter(route => route.id != routeId);
        this.saveRoutesToStorage();
        this.updateSavedRoutesList();
        this.showToast('Маршрут удален');
    }

    exportGPX() {
        if (this.routePoints.length < 2) {
            this.showToast('Нет данных для экспорта');
            return;
        }
        
        const routeName = document.getElementById('route-name-input').value.trim() || 
                         `Маршрут_${new Date().toISOString().split('T')[0]}`;
        
        // Нормализуем имя файла
        const normalizedName = routeName
            .replace(/[^a-zA-Z0-9а-яА-Я\s_-]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
        
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RoutesApp" xmlns="http://www.topografix.com/GPX/1/1">
    <metadata>
        <name>${this.escapeXml(routeName)}</name>
        <desc>Маршрут создан в RoutesApp</desc>
        <time>${new Date().toISOString()}</time>
    </metadata>`;
        
        // Добавляем точки маршрута (waypoints)
        this.routePoints.forEach((point, index) => {
            gpx += `
    <wpt lat="${point.latlng.lat}" lon="${point.latlng.lng}">
        <name>${this.escapeXml(point.name)}</name>
        <desc>Точка ${index + 1} маршрута</desc>
    </wpt>`;
        });
        
        // Добавляем трек-сегменты с разными типами транспорта
        this.routeSegments.forEach((segment, segmentIndex) => {
            gpx += `
    <trk>
        <name>Сегмент ${segmentIndex + 1} - ${this.getTransportName(segment.transport)}</name>
        <type>${segment.transport}</type>
        <trkseg>`;
            
            if (segment.geometry && segment.geometry.coordinates) {
                segment.geometry.coordinates.forEach(coord => {
                    gpx += `
            <trkpt lat="${coord[1]}" lon="${coord[0]}">
                <extensions>
                    <transport>${segment.transport}</transport>
                </extensions>
            </trkpt>`;
                });
            }
            
            gpx += `
        </trkseg>
    </trk>`;
        });
        
        gpx += `
</gpx>`;
        
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${normalizedName}.gpx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('GPX файл экспортирован');
    }

    escapeXml(unsafe) {
        if (!unsafe) return '';
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    }

    updateUI() {
        const hasPoints = this.routePoints.length > 0;
        const hasEnoughPoints = this.routePoints.length >= 2;
        
        document.getElementById('clear-route-btn').disabled = !hasPoints;
        document.getElementById('save-route-btn').disabled = !hasEnoughPoints;
        document.getElementById('export-gpx-btn').disabled = !hasEnoughPoints;
        document.getElementById('fit-bounds-btn').disabled = !hasPoints;
    }

    editPointAtIndex(index) {
        const newName = prompt('Введите новое название точки:', this.routePoints[index].name);
        if (newName !== null && newName.trim() !== '') {
            this.routePoints[index].name = newName.trim();
            this.updatePointsList();
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
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let routesApp;

document.addEventListener('DOMContentLoaded', () => {
    routesApp = new RoutesApp();
});