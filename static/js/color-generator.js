// static/js/color-generator.js - Генератор цветов

class ColorGenerator {
    constructor() {
        this.currentColor = { h: 204, s: 70, l: 53 };
        this.savedColors = this.loadSavedColors();
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.generatePalette();
        this.renderSavedColors();
    }

    initializeElements() {
        // Основные элементы
        this.colorPreview = document.getElementById('color-preview');
        this.colorHex = document.getElementById('color-hex');
        this.colorRgb = document.getElementById('color-rgb');
        this.colorHsl = document.getElementById('color-hsl');
        
        // Слайдеры
        this.hueSlider = document.getElementById('hue-range');
        this.saturationSlider = document.getElementById('saturation-range');
        this.lightnessSlider = document.getElementById('lightness-range');
        
        // Значения слайдеров
        this.hueValue = document.getElementById('hue-value');
        this.saturationValue = document.getElementById('saturation-value');
        this.lightnessValue = document.getElementById('lightness-value');
        
        // Кнопки
        this.randomColorBtn = document.getElementById('random-color');
        this.copyHexBtn = document.getElementById('copy-hex');
        this.saveColorBtn = document.getElementById('save-color');
        this.generatePaletteBtn = document.getElementById('generate-palette');
        
        // Контейнеры
        this.paletteColors = document.getElementById('palette-colors');
        this.savedColorsGrid = document.getElementById('saved-colors-grid');
    }

    bindEvents() {
        // Слайдеры
        this.hueSlider.addEventListener('input', () => this.updateFromSliders());
        this.saturationSlider.addEventListener('input', () => this.updateFromSliders());
        this.lightnessSlider.addEventListener('input', () => this.updateFromSliders());
        
        // Кнопки
        this.randomColorBtn.addEventListener('click', () => this.generateRandomColor());
        this.copyHexBtn.addEventListener('click', () => this.copyToClipboard());
        this.saveColorBtn.addEventListener('click', () => this.saveCurrentColor());
        this.generatePaletteBtn.addEventListener('click', () => this.generatePalette());
    }

    updateFromSliders() {
        this.currentColor = {
            h: parseInt(this.hueSlider.value),
            s: parseInt(this.saturationSlider.value),
            l: parseInt(this.lightnessSlider.value)
        };
        
        this.updateSliderValues();
        this.updateDisplay();
    }

    updateSliderValues() {
        this.hueValue.textContent = `${this.currentColor.h}°`;
        this.saturationValue.textContent = `${this.currentColor.s}%`;
        this.lightnessValue.textContent = `${this.currentColor.l}%`;
    }

    updateDisplay() {
        const hex = this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l);
        const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
        
        this.colorPreview.style.backgroundColor = hex;
        this.colorHex.textContent = hex.toUpperCase();
        this.colorRgb.textContent = `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.colorHsl.textContent = `HSL(${this.currentColor.h}, ${this.currentColor.s}%, ${this.currentColor.l}%)`;
    }

    generateRandomColor() {
        this.currentColor = {
            h: Math.floor(Math.random() * 360),
            s: 30 + Math.floor(Math.random() * 50), // 30-80%
            l: 30 + Math.floor(Math.random() * 40)  // 30-70%
        };
        
        this.updateSliders();
        this.updateDisplay();
        this.generatePalette();
    }

    updateSliders() {
        this.hueSlider.value = this.currentColor.h;
        this.saturationSlider.value = this.currentColor.s;
        this.lightnessSlider.value = this.currentColor.l;
        this.updateSliderValues();
    }

    generatePalette() {
        const baseHue = this.currentColor.h;
        const palette = [];
        
        // Генерируем 5 гармоничных цветов
        for (let i = 0; i < 5; i++) {
            const hue = (baseHue + i * 72) % 360; // Равномерное распределение
            const saturation = 40 + Math.floor(Math.random() * 40); // 40-80%
            const lightness = 30 + Math.floor(Math.random() * 40); // 30-70%
            
            palette.push({
                h: hue,
                s: saturation,
                l: lightness,
                hex: this.hslToHex(hue, saturation, lightness)
            });
        }
        
        this.renderPalette(palette);
    }

    renderPalette(palette) {
        this.paletteColors.innerHTML = '';
        
        palette.forEach(color => {
            const colorElement = document.createElement('div');
            colorElement.className = 'palette-color';
            colorElement.style.backgroundColor = color.hex;
            colorElement.setAttribute('data-hex', color.hex.toUpperCase());
            
            colorElement.addEventListener('click', () => {
                this.currentColor = { h: color.h, s: color.s, l: color.l };
                this.updateSliders();
                this.updateDisplay();
            });
            
            this.paletteColors.appendChild(colorElement);
        });
    }

    saveCurrentColor() {
        const hex = this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l);
        const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
        
        const colorData = {
            hex: hex.toUpperCase(),
            hsl: { ...this.currentColor },
            rgb: rgb,
            timestamp: new Date().toISOString()
        };
        
        // Проверяем, нет ли уже такого цвета
        if (!this.savedColors.some(color => color.hex === colorData.hex)) {
            this.savedColors.push(colorData);
            this.saveColorsToStorage();
            this.renderSavedColors();
            showToast('Цвет сохранен!');
        } else {
            showToast('Этот цвет уже сохранен');
        }
    }

    renderSavedColors() {
        this.savedColorsGrid.innerHTML = '';
        
        if (this.savedColors.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'Здесь появятся сохранённые цвета';
            this.savedColorsGrid.appendChild(emptyMessage);
            return;
        }
        
        this.savedColors.forEach((color, index) => {
            const colorElement = document.createElement('div');
            colorElement.className = 'saved-color-item';
            colorElement.style.backgroundColor = color.hex;
            
            colorElement.innerHTML = `
                <div class="saved-color-hex">${color.hex}</div>
                <button class="delete-color" data-index="${index}">×</button>
            `;
            
            colorElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-color')) {
                    this.currentColor = color.hsl;
                    this.updateSliders();
                    this.updateDisplay();
                    this.generatePalette();
                }
            });
            
            const deleteBtn = colorElement.querySelector('.delete-color');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSavedColor(index);
            });
            
            this.savedColorsGrid.appendChild(colorElement);
        });
    }

    deleteSavedColor(index) {
        this.savedColors.splice(index, 1);
        this.saveColorsToStorage();
        this.renderSavedColors();
        showToast('Цвет удален');
    }

    async copyToClipboard() {
        const hex = this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l).toUpperCase();
        
        try {
            await navigator.clipboard.writeText(hex);
            showToast(`Скопировано: ${hex}`);
        } catch (err) {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = hex;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast(`Скопировано: ${hex}`);
        }
    }

    // Вспомогательные функции для преобразования цветов
    hslToHex(h, s, l) {
        const rgb = this.hslToRgb(h, s, l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Работа с localStorage
    loadSavedColors() {
        try {
            return JSON.parse(localStorage.getItem('savedColors') || '[]');
        } catch {
            return [];
        }
    }

    saveColorsToStorage() {
        localStorage.setItem('savedColors', JSON.stringify(this.savedColors));
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ColorGenerator();
});