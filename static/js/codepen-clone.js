class CodePenClone {
  constructor() {
    this.currentPen = {
      id: this.generateId(),
      title: 'Мой Pen',
      html: '',
      css: '',
      js: '',
      timestamp: Date.now()
    };
    
    this.pens = JSON.parse(localStorage.getItem('codepenPens') || '[]');
    this.isResizing = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDefaultContent();
    this.updatePreview();
  }

  bindEvents() {
    // Редакторы кода
    document.getElementById('html-editor').addEventListener('input', () => this.updatePreview());
    document.getElementById('css-editor').addEventListener('input', () => this.updatePreview());
    document.getElementById('js-editor').addEventListener('input', () => this.updatePreview());

    // Кнопки сброса
    document.querySelectorAll('.btn-reset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.closest('.btn-reset').dataset.type;
        this.resetCode(type);
      });
    });

    // Кнопки очистки
    document.getElementById('clear-html').addEventListener('click', () => this.clearCode('html'));
    document.getElementById('clear-css').addEventListener('click', () => this.clearCode('css'));
    document.getElementById('clear-js').addEventListener('click', () => this.clearCode('js'));
    document.getElementById('clear-all').addEventListener('click', () => this.clearAll());

    // Основные кнопки
    document.getElementById('new-pen').addEventListener('click', () => this.createNewPen());
    document.getElementById('save-pen').addEventListener('click', () => this.savePen());
    document.getElementById('show-collection').addEventListener('click', () => this.showCollection());

    // Название Pen
    document.getElementById('pen-title').addEventListener('input', (e) => {
      this.currentPen.title = e.target.value;
    });

    // Превью
    document.getElementById('refresh-preview').addEventListener('click', () => this.updatePreview());
    document.getElementById('fullscreen-preview').addEventListener('click', () => this.toggleFullscreen());

    // Кнопка домой
    document.getElementById('home-btn').addEventListener('click', () => {
      window.location.href = '/';
    });

    // Переключение темы
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Модальное окно
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.hideCollection());
    });

    // Ресайзер
    this.setupResizer();
  }

  loadDefaultContent() {
    const htmlEditor = document.getElementById('html-editor');
    const cssEditor = document.getElementById('css-editor');
    const jsEditor = document.getElementById('js-editor');

    this.currentPen.html = htmlEditor.value;
    this.currentPen.css = cssEditor.value;
    this.currentPen.js = jsEditor.value;
  }

  updatePreview() {
    const html = document.getElementById('html-editor').value;
    const css = document.getElementById('css-editor').value;
    const js = document.getElementById('js-editor').value;

    // Обновляем текущий Pen
    this.currentPen.html = html;
    this.currentPen.css = css;
    this.currentPen.js = js;
    this.currentPen.timestamp = Date.now();

    const iframe = document.getElementById('preview-frame');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Создаем HTML с изоляцией стилей и темным фоном
    const previewHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            ${css}
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #1a1a1a;
              color: #fff;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .preview-container {
              width: 100%;
              max-width: 1200px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            ${html}
          </div>
          <script>
            try {
              ${js}
            } catch (error) {
              console.error('JavaScript Error:', error);
            }
          </script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(previewHTML);
    iframeDoc.close();

    // Обновляем ширину в ресайзере
    this.updateWidthReadout();
  }

  updateWidthReadout() {
    const iframe = document.getElementById('preview-frame');
    const readout = document.getElementById('width-readout');
    const width = iframe.offsetWidth;
    readout.textContent = `${width}px`;
  }

  setupResizer() {
    const resizer = document.getElementById('resizer');
    const codePanels = document.querySelector('.code-panels');
    let startY, startHeight;

    resizer.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      startY = e.clientY;
      startHeight = parseInt(document.defaultView.getComputedStyle(codePanels).height, 10);
      
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      
      e.preventDefault();
    });

    const resize = (e) => {
      if (!this.isResizing) return;
      
      const height = startHeight + (e.clientY - startY);
      const minHeight = 100;
      const maxHeight = window.innerHeight - 200;
      
      if (height >= minHeight && height <= maxHeight) {
        codePanels.style.height = `${height}px`;
        this.updatePreview();
      }
    };

    const stopResize = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };
  }

  resetCode(type) {
    const defaults = {
      html: `<div class="container">
  <h1>Hello World!</h1>
  <p>Start coding here...</p>
</div>`,
      css: `body {
  font-family: Arial, sans-serif;
  background: #1a1a1a;
  margin: 0;
  padding: 20px;
  color: #fff;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: #2d2d2d;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
}`,
      js: `// JavaScript code here
console.log('Hello from JavaScript!');`
    };

    const editor = document.getElementById(`${type}-editor`);
    editor.value = defaults[type];
    this.updatePreview();
    this.showToast(`${type.toUpperCase()} сброшен до значений по умолчанию`);
  }

  clearCode(type) {
    if (confirm(`Очистить ${type.toUpperCase()}?`)) {
      document.getElementById(`${type}-editor`).value = '';
      this.updatePreview();
      this.showToast(`${type.toUpperCase()} очищен`);
    }
  }

  clearAll() {
    if (confirm('Очистить все редакторы?')) {
      document.getElementById('html-editor').value = '';
      document.getElementById('css-editor').value = '';
      document.getElementById('js-editor').value = '';
      this.updatePreview();
      this.showToast('Все редакторы очищены');
    }
  }

  createNewPen() {
    this.currentPen = {
      id: this.generateId(),
      title: 'Новый Pen',
      html: '<div class="container">\n  <h1>Новый Pen</h1>\n  <p>Начните писать код...</p>\n</div>',
      css: 'body {\n  font-family: Arial, sans-serif;\n  background: #1a1a1a;\n  color: #fff;\n  padding: 20px;\n}\n\n.container {\n  max-width: 800px;\n  margin: 0 auto;\n}',
      js: '// Начните писать JavaScript код\nconsole.log("Hello World!");',
      timestamp: Date.now()
    };

    document.getElementById('pen-title').value = this.currentPen.title;
    document.getElementById('html-editor').value = this.currentPen.html;
    document.getElementById('css-editor').value = this.currentPen.css;
    document.getElementById('js-editor').value = this.currentPen.js;
    
    this.updatePreview();
    this.showToast('Создан новый Pen');
  }

  savePen() {
    if (!this.currentPen.title.trim()) {
      this.currentPen.title = `Pen ${new Date().toLocaleDateString()}`;
      document.getElementById('pen-title').value = this.currentPen.title;
    }

    // Проверяем, существует ли уже такой Pen
    const existingIndex = this.pens.findIndex(pen => pen.id === this.currentPen.id);
    
    if (existingIndex !== -1) {
      this.pens[existingIndex] = {...this.currentPen};
    } else {
      this.pens.push({...this.currentPen});
    }

    localStorage.setItem('codepenPens', JSON.stringify(this.pens));
    this.showToast('Pen сохранен!');
  }

  showCollection() {
    this.renderPens();
    document.getElementById('collection-modal').classList.add('show');
  }

  hideCollection() {
    document.getElementById('collection-modal').classList.remove('show');
  }

  loadPen(pen) {
    this.currentPen = {...pen};
    
    document.getElementById('pen-title').value = pen.title;
    document.getElementById('html-editor').value = pen.html;
    document.getElementById('css-editor').value = pen.css;
    document.getElementById('js-editor').value = pen.js;
    
    this.updatePreview();
    this.hideCollection();
    this.showToast(`Загружен: ${pen.title}`);
  }

  renderPens() {
    const grid = document.getElementById('pens-grid');
    grid.innerHTML = '';

    if (this.pens.length === 0) {
      grid.innerHTML = '<div class="no-pens">Нет сохраненных Pens</div>';
      return;
    }

    this.pens.forEach((pen, index) => {
      const penItem = document.createElement('div');
      penItem.className = 'pen-item';
      
      // Создаем миниатюру на основе HTML
      const previewBg = this.generatePreviewBackground(pen.html, pen.css);
      
      penItem.innerHTML = `
        <div class="pen-item-preview" style="background: ${previewBg}">
          ${pen.title}
        </div>
        <div class="pen-item-name">${pen.title}</div>
        <button class="pen-item-remove" data-index="${index}">
          <i class="fas fa-times"></i>
        </button>
      `;

      penItem.addEventListener('click', (e) => {
        if (!e.target.closest('.pen-item-remove')) {
          this.loadPen(pen);
        }
      });

      // Обработчик удаления
      penItem.querySelector('.pen-item-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePen(index);
      });

      grid.appendChild(penItem);
    });
  }

  generatePreviewBackground(html, css) {
    // Простая цветовая схема на основе содержимого
    const hash = this.hashCode(html + css);
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #a8edea, #fed6e3)'
    ];
    
    return colors[hash % colors.length];
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  deletePen(index) {
    if (confirm('Удалить этот Pen?')) {
      this.pens.splice(index, 1);
      localStorage.setItem('codepenPens', JSON.stringify(this.pens));
      this.renderPens();
      this.showToast('Pen удален');
    }
  }

  toggleFullscreen() {
    document.body.classList.toggle('fullscreen');
    const btn = document.getElementById('fullscreen-preview');
    const icon = btn.querySelector('i');
    
    if (document.body.classList.contains('fullscreen')) {
      icon.className = 'fas fa-compress';
      this.showToast('Полноэкранный режим');
    } else {
      icon.className = 'fas fa-expand';
      this.showToast('Обычный режим');
    }
    
    this.updatePreview();
  }

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('codePenTheme', newTheme);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  new CodePenClone();
  
  // Восстановление темы
  const savedTheme = localStorage.getItem('codePenTheme') || 'dark';
  document.body.setAttribute('data-theme', savedTheme);
});