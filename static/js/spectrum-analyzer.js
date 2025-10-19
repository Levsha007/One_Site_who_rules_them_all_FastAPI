// spectrum-analyzer.js
class SpectrumAnalyzer {
    constructor() {
        this.canvas = document.getElementById('spectrumCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.animationId = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.history = [];
        this.historyLength = 10;
        this.particles = [];
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / 60;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Настройки по умолчанию
        this.defaultSettings = {
            visualizationType: 'spiral',
            barsCount: 128,
            sensitivity: 2.0,
            speed: 2,
            colorScheme: 'red',
            customColors: ['#c0392b', '#e74c3c', '#d35400'],
            glowIntensity: 10,
            lineWidth: 3,
            particleSize: 3,
            particleCount: 200,
            circleRadius: 38,
            isCleanMode: false,
            // Новые настройки
            spiralTurns: 3,
            spiralScale: 400,
            noiseThreshold: 0.0,
            noiseSmoothing: 0.5
        };

        this.settings = {...this.defaultSettings};
        this.colorSchemes = {
            red: ['#c0392b', '#e74c3c', '#d35400', '#e67e22', '#f39c12'],
            blue: ['#2980b9', '#3498db', '#1abc9c', '#2ecc71', '#3498db'],
            green: ['#27ae60', '#2ecc71', '#1abc9c', '#16a085', '#27ae60'],
            purple: ['#8e44ad', '#9b59b6', '#a569bd', '#bb8fce', '#8e44ad'],
            orange: ['#d35400', '#e67e22', '#f39c12', '#f1c40f', '#d35400'],
            cyan: ['#00bcd4', '#00e5ff', '#00acc1', '#0097a7', '#00838f'],
            pink: ['#e91e63', '#f06292', '#ec407a', '#d81b60', '#c2185b'],
            yellow: ['#f1c40f', '#f39c12', '#f7dc6f', '#f4d03f', '#d4ac0d'],
            rainbow: ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff'],
            fire: ['#ff0000', '#ff4000', '#ff8000', '#ffbf00', '#ffff00'],
            ice: ['#00ffff', '#00bfff', '#0080ff', '#0040ff', '#0000ff'],
            forest: ['#006400', '#008000', '#228b22', '#32cd32', '#00ff00'],
            ocean: ['#000080', '#0000ff', '#0080ff', '#00ffff', '#00bfff'],
            sunset: ['#ff4500', '#ff6347', '#ff7f50', '#ff8c00', '#ffa500'],
            neon: ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00'],
            pastel: ['#ffb6c1', '#87ceeb', '#98fb98', '#dda0dd', '#f0e68c'],
            monochrome: ['#333333', '#666666', '#999999', '#cccccc', '#ffffff']
        };

        // Музыкальные ноты для анализа
        this.musicalNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.resizeCanvas();
        this.setupSettingsPanel();
        // Автоматический сброс всех настроек при загрузке
        this.resetAllSettings();
        // НЕМЕДЛЕННЫЙ запуск при загрузке страницы
        this.start();
    }

    setupEventListeners() {
        // Кнопки управления
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettingsPanel());
        document.getElementById('cleanModeBtn').addEventListener('click', () => this.toggleCleanMode());
        document.getElementById('closePanel').addEventListener('click', () => this.hideSettingsPanel());
        document.getElementById('cleanModeExit').addEventListener('click', () => this.toggleCleanMode());

        // Тип визуализации
        document.getElementById('visualizationType').addEventListener('change', (e) => {
            this.settings.visualizationType = e.target.value;
            this.saveSettings();
            this.resetParticles();
        });

        // Количество столбцов
        document.getElementById('barsCountSlider').addEventListener('input', (e) => {
            this.settings.barsCount = parseInt(e.target.value);
            document.getElementById('barsCountValue').textContent = e.target.value;
            this.saveSettings();
        });

        // Цветовые схемы
        document.querySelectorAll('.color-scheme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-scheme-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.settings.colorScheme = e.currentTarget.dataset.scheme;
                this.saveSettings();
                this.resetParticles();
            });
        });

        // Пользовательские цвета
        document.getElementById('applyCustomColors').addEventListener('click', () => {
            this.settings.customColors = [
                document.getElementById('color1').value,
                document.getElementById('color2').value,
                document.getElementById('color3').value
            ];
            this.settings.colorScheme = 'custom';
            this.saveSettings();
            this.resetParticles();
            showToast('Пользовательские цвета применены!');
        });

        // Слайдеры настроек
        document.getElementById('sensitivitySlider').addEventListener('input', (e) => {
            this.settings.sensitivity = parseInt(e.target.value) / 100;
            document.getElementById('sensitivityValue').textContent = e.target.value + '%';
            this.saveSettings();
        });

        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.settings.speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = e.target.value;
            this.updateFrameRate();
            this.saveSettings();
        });

        document.getElementById('glowSlider').addEventListener('input', (e) => {
            this.settings.glowIntensity = parseInt(e.target.value);
            document.getElementById('glowValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('lineWidthSlider').addEventListener('input', (e) => {
            this.settings.lineWidth = parseInt(e.target.value);
            document.getElementById('lineWidthValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('particleSizeSlider').addEventListener('input', (e) => {
            this.settings.particleSize = parseInt(e.target.value);
            document.getElementById('particleSizeValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('particleCountSlider').addEventListener('input', (e) => {
            this.settings.particleCount = parseInt(e.target.value);
            document.getElementById('particleCountValue').textContent = e.target.value;
            this.resetParticles();
            this.saveSettings();
        });

        document.getElementById('circleRadiusSlider').addEventListener('input', (e) => {
            this.settings.circleRadius = parseInt(e.target.value);
            document.getElementById('circleRadiusValue').textContent = e.target.value + '%';
            this.saveSettings();
        });

        // Новые слайдеры
        document.getElementById('spiralTurnsSlider').addEventListener('input', (e) => {
            this.settings.spiralTurns = parseInt(e.target.value);
            document.getElementById('spiralTurnsValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('spiralScaleSlider').addEventListener('input', (e) => {
            this.settings.spiralScale = parseInt(e.target.value);
            document.getElementById('spiralScaleValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('noiseThresholdSlider').addEventListener('input', (e) => {
            this.settings.noiseThreshold = parseInt(e.target.value) / 100;
            document.getElementById('noiseThresholdValue').textContent = this.settings.noiseThreshold.toFixed(2);
            this.saveSettings();
        });

        document.getElementById('noiseSmoothingSlider').addEventListener('input', (e) => {
            this.settings.noiseSmoothing = parseInt(e.target.value) / 100;
            document.getElementById('noiseSmoothingValue').textContent = this.settings.noiseSmoothing.toFixed(2);
            this.saveSettings();
        });

        // Кнопки управления
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());

        // Кнопки сброса настроек
        document.getElementById('resetBasicSettings').addEventListener('click', () => this.resetBasicSettings());
        document.getElementById('resetColorSettings').addEventListener('click', () => this.resetColorSettings());
        document.getElementById('resetAdvancedSettings').addEventListener('click', () => this.resetAdvancedSettings());

        // Оверлей для закрытия панели
        document.getElementById('panelOverlay').addEventListener('click', () => this.hideSettingsPanel());

        // Ресайз окна
        window.addEventListener('resize', () => this.resizeCanvas());

        // Обработка полноэкранного режима
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }

    setupSettingsPanel() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.parentElement;
                category.classList.toggle('active');
            });
        });
        document.querySelector('.settings-category').classList.add('active');
    }

    loadSettings() {
        const saved = localStorage.getItem('spectrumAnalyzerSettings');
        if (saved) {
            try {
                const loaded = JSON.parse(saved);
                this.settings = {...this.settings, ...loaded};
                this.applySettingsToUI();
            } catch (e) {
                console.error('Ошибка загрузки настроек:', e);
            }
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('spectrumAnalyzerSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
    }

    applySettingsToUI() {
        // Применяем настройки к UI
        document.getElementById('visualizationType').value = this.settings.visualizationType;
        
        document.getElementById('barsCountSlider').value = this.settings.barsCount;
        document.getElementById('barsCountValue').textContent = this.settings.barsCount;
        
        document.getElementById('sensitivitySlider').value = this.settings.sensitivity * 100;
        document.getElementById('sensitivityValue').textContent = (this.settings.sensitivity * 100) + '%';
        
        document.getElementById('speedSlider').value = this.settings.speed;
        document.getElementById('speedValue').textContent = this.settings.speed;
        
        document.getElementById('glowSlider').value = this.settings.glowIntensity;
        document.getElementById('glowValue').textContent = this.settings.glowIntensity;
        
        document.getElementById('lineWidthSlider').value = this.settings.lineWidth;
        document.getElementById('lineWidthValue').textContent = this.settings.lineWidth;
        
        document.getElementById('particleSizeSlider').value = this.settings.particleSize;
        document.getElementById('particleSizeValue').textContent = this.settings.particleSize;
        
        document.getElementById('particleCountSlider').value = this.settings.particleCount;
        document.getElementById('particleCountValue').textContent = this.settings.particleCount;
        
        document.getElementById('circleRadiusSlider').value = this.settings.circleRadius;
        document.getElementById('circleRadiusValue').textContent = this.settings.circleRadius + '%';

        // Новые настройки
        document.getElementById('spiralTurnsSlider').value = this.settings.spiralTurns;
        document.getElementById('spiralTurnsValue').textContent = this.settings.spiralTurns;

        document.getElementById('spiralScaleSlider').value = this.settings.spiralScale;
        document.getElementById('spiralScaleValue').textContent = this.settings.spiralScale;

        document.getElementById('noiseThresholdSlider').value = this.settings.noiseThreshold * 100;
        document.getElementById('noiseThresholdValue').textContent = this.settings.noiseThreshold.toFixed(2);

        document.getElementById('noiseSmoothingSlider').value = this.settings.noiseSmoothing * 100;
        document.getElementById('noiseSmoothingValue').textContent = this.settings.noiseSmoothing.toFixed(2);

        // Цветовые схемы
        document.querySelectorAll('.color-scheme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.scheme === this.settings.colorScheme) {
                btn.classList.add('active');
            }
        });

        // Пользовательские цвета
        if (this.settings.colorScheme === 'custom') {
            document.getElementById('color1').value = this.settings.customColors[0];
            document.getElementById('color2').value = this.settings.customColors[1];
            document.getElementById('color3').value = this.settings.customColors[2];
        }

        this.updateFrameRate();
    }

    updateFrameRate() {
        const targetFPS = 30 + (this.settings.speed * 9);
        this.frameInterval = 1000 / targetFPS;
    }

    resetBasicSettings() {
        this.settings.visualizationType = this.defaultSettings.visualizationType;
        this.settings.barsCount = this.defaultSettings.barsCount;
        this.settings.sensitivity = this.defaultSettings.sensitivity;
        this.settings.speed = this.defaultSettings.speed;
        this.applySettingsToUI();
        this.saveSettings();
        showToast('Основные настройки сброшены');
    }

    resetColorSettings() {
        this.settings.colorScheme = this.defaultSettings.colorScheme;
        this.settings.customColors = [...this.defaultSettings.customColors];
        this.applySettingsToUI();
        this.saveSettings();
        this.resetParticles();
        showToast('Цветовые настройки сброшены');
    }

    resetAdvancedSettings() {
        this.settings.glowIntensity = this.defaultSettings.glowIntensity;
        this.settings.lineWidth = this.defaultSettings.lineWidth;
        this.settings.particleSize = this.defaultSettings.particleSize;
        this.settings.particleCount = this.defaultSettings.particleCount;
        this.settings.circleRadius = this.defaultSettings.circleRadius;
        this.settings.spiralTurns = this.defaultSettings.spiralTurns;
        this.settings.spiralScale = this.defaultSettings.spiralScale;
        this.settings.noiseThreshold = this.defaultSettings.noiseThreshold;
        this.settings.noiseSmoothing = this.defaultSettings.noiseSmoothing;
        this.applySettingsToUI();
        this.saveSettings();
        showToast('Дополнительные настройки сброшены');
    }

    resetAllSettings() {
        this.settings = {...this.defaultSettings};
        this.applySettingsToUI();
        this.saveSettings();
        this.resetParticles();
        // Не показываем toast при автоматическом сбросе
    }

    resetParticles() {
        this.particles = [];
    }

    toggleSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        const overlay = document.getElementById('panelOverlay');
        
        if (panel.classList.contains('open')) {
            this.hideSettingsPanel();
        } else {
            panel.classList.add('open');
            overlay.classList.add('active');
        }
    }

    hideSettingsPanel() {
        const panel = document.getElementById('settingsPanel');
        const overlay = document.getElementById('panelOverlay');
        
        panel.classList.remove('open');
        overlay.classList.remove('active');
    }

    toggleCleanMode() {
        this.settings.isCleanMode = !this.settings.isCleanMode;
        document.body.classList.toggle('clean-mode', this.settings.isCleanMode);
        
        if (this.settings.isCleanMode) {
            this.hideSettingsPanel();
            this.enterFullscreen();
            showToast('Чистый режим активирован');
        } else {
            this.exitFullscreen();
            showToast('Чистый режим отключен');
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async start() {
        try {
            if (this.settings.isRunning) return;

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,
                    channelCount: 1
                } 
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            // Применяем настройки сглаживания сразу
            this.analyser.fftSize = 4096;
            this.analyser.smoothingTimeConstant = 0.3;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            this.history = Array.from({ length: this.historyLength }, () => new Uint8Array(this.bufferLength));
            
            this.microphone.connect(this.analyser);
            
            this.settings.isRunning = true;
            this.updateUI(true);
            this.updateFrameRate();
            this.animate();

            showToast('Визуализатор запущен! Включите музыку 🎵');

        } catch (error) {
            console.error('Ошибка доступа к микрофону:', error);
            showToast('Ошибка: Не удалось получить доступ к микрофону');
            this.fallbackToTestData();
        }
    }

    fallbackToTestData() {
        // Создаем тестовые данные для демонстрации
        this.settings.isRunning = true;
        this.updateUI(true);
        this.bufferLength = 1024;
        this.dataArray = new Uint8Array(this.bufferLength);
        // Заполняем тестовыми данными
        for (let i = 0; i < this.bufferLength; i++) {
            this.dataArray[i] = Math.random() * 128 + 64;
        }
        this.updateFrameRate();
        this.animate();
        showToast('Демо-режим: используйте тестовые данные');
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.settings.isRunning = false;
        this.updateUI(false);
        this.clearCanvas();

        showToast('Визуализатор остановлен');
    }

    updateUI(isRunning) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');

        if (isRunning) {
            statusDot.classList.add('active');
            statusText.textContent = 'Запись активна 🎵';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = 'Остановлен';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate(currentTime = 0) {
        if (!this.settings.isRunning) return;

        // Контроль FPS
        const deltaTime = currentTime - this.lastFrameTime;
        if (deltaTime < this.frameInterval) {
            this.animationId = requestAnimationFrame((time) => this.animate(time));
            return;
        }
        this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);

        // Получаем данные
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);
        } else {
            // Тестовые данные с небольшими изменениями
            for (let i = 0; i < this.bufferLength; i++) {
                const change = (Math.random() - 0.5) * 20;
                this.dataArray[i] = Math.max(0, Math.min(255, this.dataArray[i] + change));
            }
        }

        // Подавление шума
        this.applyNoiseReduction();
        
        // Обновление истории для сглаживания
        this.history.push(new Uint8Array(this.dataArray));
        if (this.history.length > this.historyLength) {
            this.history.shift();
        }

        // Очистка canvas
        const fadeAmount = 0.05 + (10 - this.settings.speed) * 0.015;
        this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Визуализация
        switch (this.settings.visualizationType) {
            case 'bars': this.drawBars(); break;
            case 'circleBars': this.drawCircleBars(); break;
            case 'wave': this.drawWave(); break;
            case 'spectrum': this.drawSpectrum(); break;
            case 'particles': this.drawParticles(); break;
            case 'mountain': this.drawMountain(); break;
            case 'liquid': this.drawLiquid(); break;
            case 'neon': this.drawNeon(); break;
            case 'grid': this.drawGrid(); break;
            case 'spiral': this.drawSpiral(); break;
            case 'spiralBars': this.drawSpiralBars(); break;
            case 'mirrorBars': this.drawMirrorBars(); break;
            case 'mirrorWave': this.drawMirrorWave(); break;
            case 'mirrorSpectrum': this.drawMirrorSpectrum(); break;
            case 'circle': this.drawCircle(); break;
            case 'radar': this.drawRadar(); break;
        }

        // Обновление статистики
        this.updateStats(currentTime);

        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }

    applyNoiseReduction() {
        const threshold = this.settings.noiseThreshold * 255;
        const smoothing = this.settings.noiseSmoothing;

        for (let i = 0; i < this.bufferLength; i++) {
            // Пороговое значение
            if (this.dataArray[i] < threshold) {
                this.dataArray[i] = 0;
            } else {
                // Сглаживание с историей
                if (this.history.length > 1) {
                    const historicalValue = this.history[this.history.length - 2][i];
                    this.dataArray[i] = this.dataArray[i] * (1 - smoothing) + historicalValue * smoothing;
                }
            }
        }
    }

    updateStats(currentTime) {
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;

            // Базовые метрики
            let sum = 0;
            let peak = 0;
            let activeFrequencies = 0;
            let spectralEnergy = 0;

            // Диапазоны частот
            const bassRange = [0, Math.floor(this.bufferLength * 0.1)]; // 0-10%
            const midRange = [Math.floor(this.bufferLength * 0.1), Math.floor(this.bufferLength * 0.5)]; // 10-50%
            const highRange = [Math.floor(this.bufferLength * 0.5), this.bufferLength - 1]; // 50-100%

            let bassSum = 0, midSum = 0, highSum = 0;
            let dominantFreqIndex = 0;
            let maxAmplitude = 0;

            for (let i = 0; i < this.bufferLength; i++) {
                const amplitude = this.dataArray[i];
                sum += amplitude;
                spectralEnergy += amplitude * amplitude;
                
                if (amplitude > peak) {
                    peak = amplitude;
                }
                
                if (amplitude > this.settings.noiseThreshold * 255) {
                    activeFrequencies++;
                }

                // Находим доминирующую частоту
                if (amplitude > maxAmplitude) {
                    maxAmplitude = amplitude;
                    dominantFreqIndex = i;
                }

                // Суммируем по диапазонам
                if (i >= bassRange[0] && i <= bassRange[1]) {
                    bassSum += amplitude;
                } else if (i >= midRange[0] && i <= midRange[1]) {
                    midSum += amplitude;
                } else if (i >= highRange[0] && i <= highRange[1]) {
                    highSum += amplitude;
                }
            }

            const average = sum / this.bufferLength;
            const bassLevel = bassSum / (bassRange[1] - bassRange[0] + 1);
            const midLevel = midSum / (midRange[1] - midRange[0] + 1);
            const highLevel = highSum / (highRange[1] - highRange[0] + 1);

            // Вычисляем доминирующую частоту
            const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
            const dominantFrequency = dominantFreqIndex * sampleRate / (this.bufferLength * 2);

            // Определяем ноту и октаву
            const noteInfo = this.frequencyToNote(dominantFrequency);

            // Обновляем DOM
            document.getElementById('fps').textContent = this.fps;
            document.getElementById('volumeLevel').textContent = Math.round(average);
            document.getElementById('peakAmplitude').textContent = Math.round(peak);
            document.getElementById('averageAmplitude').textContent = Math.round(average);
            document.getElementById('activeFrequencies').textContent = activeFrequencies;
            document.getElementById('spectralEnergy').textContent = Math.round(spectralEnergy / 1000);

            // Новые метрики
            document.getElementById('bassRange').textContent = Math.round(bassLevel);
            document.getElementById('midRange').textContent = Math.round(midLevel);
            document.getElementById('highRange').textContent = Math.round(highLevel);
            document.getElementById('dominantFreq').textContent = Math.round(dominantFrequency);
            document.getElementById('octave').textContent = noteInfo.octave;
            document.getElementById('musicalNote').textContent = noteInfo.note;

            // Условная загрузка (на основе FPS)
            const cpuLoad = Math.max(0, 100 - (this.fps / 60) * 100);
            document.getElementById('cpuLoad').textContent = Math.round(cpuLoad);
        }
    }

    frequencyToNote(frequency) {
        if (frequency === 0) return { note: '-', octave: 0 };
        
        const A4 = 440;
        const noteNumber = 12 * Math.log2(frequency / A4) + 69;
        const noteIndex = Math.round(noteNumber) % 12;
        const octave = Math.floor(noteNumber / 12) - 1;
        
        return {
            note: this.musicalNotes[noteIndex],
            octave: octave
        };
    }

    getColors() {
        if (this.settings.colorScheme === 'custom') {
            return this.settings.customColors;
        }
        return this.colorSchemes[this.settings.colorScheme] || this.colorSchemes.red;
    }

    drawBars() {
        const barCount = this.settings.barsCount;
        const barWidth = this.canvas.width / barCount;
        const colors = this.getColors();

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i / barCount * this.bufferLength);
            const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
            const barHeight = amplitude * this.canvas.height * 0.8;

            const x = i * barWidth;
            const y = this.canvas.height - barHeight;

            const colorIndex = Math.floor(i / barCount * colors.length);
            const color = colors[colorIndex % colors.length];

            const gradient = this.ctx.createLinearGradient(x, this.canvas.height, x, y);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);

            if (this.settings.glowIntensity > 0) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = this.settings.glowIntensity;
                this.ctx.fillRect(x, y, barWidth - 1, barHeight);
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawCircleBars() {
        const barCount = this.settings.barsCount;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * (this.settings.circleRadius / 100);
        const colors = this.getColors();

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i / barCount * this.bufferLength);
            const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
            const barHeight = amplitude * radius * 0.8;
            const angle = (i / barCount) * Math.PI * 2;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            const colorIndex = Math.floor(i / barCount * colors.length);
            const color = colors[colorIndex % colors.length];

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = this.settings.lineWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            if (this.settings.glowIntensity > 0) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = this.settings.glowIntensity;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawWave() {
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const y = this.canvas.height - (amplitude * this.canvas.height);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        const colors = this.getColors();
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });

        this.ctx.strokeStyle = gradient;
        
        if (this.settings.glowIntensity > 0) {
            this.ctx.shadowColor = colors[0];
            this.ctx.shadowBlur = this.settings.glowIntensity;
        }
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawSpectrum() {
        const sliceWidth = this.canvas.width / this.bufferLength;
        let x = 0;
        const colors = this.getColors();

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity;
            const barHeight = amplitude * this.canvas.height / 256;

            if (this.settings.colorScheme === 'rainbow') {
                const hue = (i / this.bufferLength) * 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            } else {
                const colorIndex = Math.floor(i / this.bufferLength * colors.length);
                this.ctx.fillStyle = colors[colorIndex % colors.length];
            }

            this.ctx.fillRect(x, this.canvas.height - barHeight, sliceWidth + 1, barHeight);
            x += sliceWidth + 1;
        }
    }

    drawParticles() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.getColors();

        if (this.particles.length !== this.settings.particleCount) {
            this.particles = Array.from({ length: this.settings.particleCount }, (_, i) => ({
                angle: (i / this.settings.particleCount) * Math.PI * 2,
                radius: 0,
                targetRadius: 0,
                color: colors[i % colors.length],
                speed: 0.1 + Math.random() * 0.2
            }));
        }

        for (let i = 0; i < this.settings.particleCount; i++) {
            const particle = this.particles[i];
            const dataIndex = Math.floor(i / this.settings.particleCount * this.bufferLength);
            const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
            
            particle.targetRadius = amplitude * Math.min(centerX, centerY) * 0.8;
            particle.radius += (particle.targetRadius - particle.radius) * particle.speed;
            
            const x = centerX + Math.cos(particle.angle) * particle.radius;
            const y = centerY + Math.sin(particle.angle) * particle.radius;

            const size = 1 + amplitude * this.settings.particleSize;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();

            if (this.settings.glowIntensity > 0) {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = this.settings.glowIntensity * amplitude;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }

            if (amplitude > 0.2) {
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY);
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = particle.color + '40';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
    }

    drawMountain() {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);

        const sliceWidth = this.canvas.width / this.bufferLength;
        const colors = this.getColors();

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const x = i * sliceWidth;
            const y = this.canvas.height - (amplitude * this.canvas.height * 0.6);
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.closePath();

        // Исправленный градиент для гор
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, this.canvas.height * 0.4);
        gradient.addColorStop(0, colors[0] + '80');
        gradient.addColorStop(1, colors[colors.length - 1]);

        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = colors[0];
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.stroke();
    }

    drawLiquid() {
        const centerY = this.canvas.height / 2;
        const colors = this.getColors();

        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const x = (i / this.bufferLength) * this.canvas.width;
            const y = centerY + Math.sin(x * 0.01 + Date.now() * 0.001) * amplitude * 100;
            this.ctx.lineTo(x, y);
        }

        this.ctx.lineTo(this.canvas.width, centerY);
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color + '80');
        });

        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = colors[0];
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.stroke();
    }

    drawNeon() {
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / this.bufferLength;
        const colors = this.getColors();

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const x = i * sliceWidth;
            const y = this.canvas.height / 2 + Math.sin(x * 0.02 + Date.now() * 0.002) * amplitude * 200;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.strokeStyle = colors[0];
        this.ctx.shadowColor = colors[0];
        this.ctx.shadowBlur = this.settings.glowIntensity;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = colors[1] || colors[0];
        this.ctx.stroke();
    }

    drawGrid() {
        const gridSize = 20;
        const colors = this.getColors();
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            for (let y = 0; y < this.canvas.height; y += gridSize) {
                const dataIndex = Math.floor((x + y) / (this.canvas.width + this.canvas.height) * this.bufferLength);
                const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
                
                if (amplitude > 0.1) {
                    const colorIndex = Math.floor((x + y) / (this.canvas.width + this.canvas.height) * colors.length);
                    const color = colors[colorIndex % colors.length];
                    
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x, y, gridSize * amplitude, gridSize * amplitude);
                }
            }
        }
    }

    drawSpiral() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.getColors();
        
        this.ctx.beginPath();
        
        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const angle = (i / this.bufferLength) * Math.PI * 2 * this.settings.spiralTurns;
            const radius = 50 + amplitude * this.settings.spiralScale;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        const colorIndex = Math.floor(Date.now() * 0.001 % colors.length);
        this.ctx.strokeStyle = colors[colorIndex];
        this.ctx.lineWidth = this.settings.lineWidth;
        
        if (this.settings.glowIntensity > 0) {
            this.ctx.shadowColor = colors[colorIndex];
            this.ctx.shadowBlur = this.settings.glowIntensity;
        }
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawSpiralBars() {
        const barCount = this.settings.barsCount;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.getColors();

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i / barCount * this.bufferLength);
            const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
            const angle = (i / barCount) * Math.PI * 2 * this.settings.spiralTurns;
            const radius = 50 + i * 2;
            const barHeight = amplitude * this.settings.spiralScale;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            const colorIndex = Math.floor(i / barCount * colors.length);
            const color = colors[colorIndex % colors.length];

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            if (this.settings.glowIntensity > 0) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = this.settings.glowIntensity;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawMirrorBars() {
        const barCount = this.settings.barsCount;
        const barWidth = this.canvas.width / barCount;
        const colors = this.getColors();
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i / barCount * this.bufferLength);
            const amplitude = this.dataArray[dataIndex] * this.settings.sensitivity / 256;
            const barHeight = amplitude * this.canvas.height * 0.4;

            const x = i * barWidth;
            const colorIndex = Math.floor(i / barCount * colors.length);
            const color = colors[colorIndex % colors.length];

            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
            this.ctx.fillRect(x, centerY, barWidth - 1, barHeight);

            if (this.settings.glowIntensity > 0) {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = this.settings.glowIntensity;
                this.ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
                this.ctx.fillRect(x, centerY, barWidth - 1, barHeight);
                this.ctx.shadowBlur = 0;
            }
        }
    }

    drawMirrorWave() {
        const centerY = this.canvas.height / 2;
        const colors = this.getColors();

        this.ctx.lineWidth = this.settings.lineWidth;
        
        // Верхняя волна
        this.ctx.beginPath();
        const sliceWidth = this.canvas.width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const y = centerY - (amplitude * this.canvas.height * 0.4);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });

        this.ctx.strokeStyle = gradient;
        
        if (this.settings.glowIntensity > 0) {
            this.ctx.shadowColor = colors[0];
            this.ctx.shadowBlur = this.settings.glowIntensity;
        }
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Нижняя волна
        this.ctx.beginPath();
        x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const y = centerY + (amplitude * this.canvas.height * 0.4);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        this.ctx.strokeStyle = gradient;
        
        if (this.settings.glowIntensity > 0) {
            this.ctx.shadowColor = colors[0];
            this.ctx.shadowBlur = this.settings.glowIntensity;
        }
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    drawMirrorSpectrum() {
        const sliceWidth = this.canvas.width / this.bufferLength;
        const centerY = this.canvas.height / 2;
        let x = 0;
        const colors = this.getColors();

        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity;
            const barHeight = amplitude * this.canvas.height / 512;

            if (this.settings.colorScheme === 'rainbow') {
                const hue = (i / this.bufferLength) * 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            } else {
                const colorIndex = Math.floor(i / this.bufferLength * colors.length);
                this.ctx.fillStyle = colors[colorIndex % colors.length];
            }

            this.ctx.fillRect(x, centerY - barHeight, sliceWidth + 1, barHeight);
            this.ctx.fillRect(x, centerY, sliceWidth + 1, barHeight);
            x += sliceWidth + 1;
        }
    }

    drawCircle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * (this.settings.circleRadius / 100);

        this.ctx.beginPath();
        
        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const pointRadius = radius + amplitude * radius * 0.5;

            const x = centerX + Math.cos(angle) * pointRadius;
            const y = centerY + Math.sin(angle) * pointRadius;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();

        const colors = this.getColors();
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[colors.length - 1] + '40');

        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = colors[0];
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.stroke();
    }

    drawRadar() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * (this.settings.circleRadius / 100);
        const colors = this.getColors();

        // Круговые линии
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        for (let r = radius / 4; r <= radius; r += radius / 4) {
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Радиальные линии
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            this.ctx.stroke();
        }

        // Данные радара
        this.ctx.beginPath();
        for (let i = 0; i < this.bufferLength; i++) {
            const amplitude = this.dataArray[i] * this.settings.sensitivity / 256;
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const pointRadius = amplitude * radius;

            const x = centerX + Math.cos(angle) * pointRadius;
            const y = centerY + Math.sin(angle) * pointRadius;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color + '80');
        });

        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = colors[0];
        this.ctx.lineWidth = this.settings.lineWidth;
        this.ctx.stroke();

        // Вращающаяся линия
        const scanAngle = (Date.now() * 0.002) % (Math.PI * 2);
        this.ctx.strokeStyle = colors[0];
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX + Math.cos(scanAngle) * radius, centerY + Math.sin(scanAngle) * radius);
        this.ctx.stroke();
    }

    handleFullscreenChange() {
        setTimeout(() => this.resizeCanvas(), 100);
    }

    enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.spectrumAnalyzer = new SpectrumAnalyzer();
});