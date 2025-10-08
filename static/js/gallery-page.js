// static/js/gallery-page.js — галерея для FastAPI с 3D эффектами

// Проверяем что мы на правильной странице
if (!document.getElementById('gallery-grid')) {
  console.log('[Gallery] Страница не загружена.');
}

// === Универсальные утилиты (локально) ===
function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem('nameOverrides') || '{}');
  } catch {
    return {};
  }
}
function writeOverrides(o) {
  localStorage.setItem('nameOverrides', JSON.stringify(o));
}

function readFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
  } catch {
    return new Set();
  }
}
function writeFavorites(set) {
  localStorage.setItem('favorites', JSON.stringify(Array.from(set)));
}

// === Masonry + загрузка галерей ===
let masonry = null;
const grid = document.getElementById('gallery-grid');
let currentPage = 0;
const itemsPerPage = 150;

// ========== Управление колонками/ползунком ==========
const sliderContainer = document.querySelector('.slider-container');
const sliderFill = document.querySelector('.slider-fill');
const sliderThumb = document.querySelector('.slider-thumb');
const sizeValue = document.getElementById('sizeValue');
const decreaseBtn = document.getElementById('decrease-cols');
const increaseBtn = document.getElementById('increase-cols');

let numCols = 3;
const minCols = 1;
const maxCols = 10;

// === 3D Эффекты для изображений ===
class Image3DEffect {
  constructor(imgElement) {
    this.img = imgElement;
    this.container = imgElement.closest('.grid-item');
    this.isHovering = false;
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0, y: 0 };
    this.mousePosition = { x: 0, y: 0 };
    
    this.init();
  }

  init() {
    // Добавляем стили для 3D преобразований
    this.img.style.transition = 'transform 0.3s ease-out';
    this.img.style.transformStyle = 'preserve-3d';
    this.img.style.willChange = 'transform';
    
    // Добавляем тень для глубины
    this.img.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
    
    // Обработчики событий мыши
    this.container.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Анимация
    this.animate();
  }

  handleMouseEnter() {
    this.isHovering = true;
    this.img.style.transition = 'transform 0.2s ease-out, box-shadow 0.3s ease';
    this.img.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)';
  }

  handleMouseLeave() {
    this.isHovering = false;
    this.targetRotation = { x: 0, y: 0 };
    this.img.style.transition = 'transform 0.5s ease-out, box-shadow 0.3s ease';
    this.img.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
  }

  handleMouseMove(e) {
    if (!this.isHovering) return;

    const rect = this.container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Вычисляем относительное положение мыши
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Нормализуем значения от -1 до 1
    const normalizedX = mouseX / (rect.width / 2);
    const normalizedY = mouseY / (rect.height / 2);
    
    // Устанавливаем целевое вращение (максимум 15 градусов)
    this.targetRotation = {
      x: normalizedY * 15, // Наклон по X зависит от положения Y
      y: -normalizedX * 15 // Наклон по Y зависит от положения X
    };
  }

  animate() {
    // Плавная интерполяция текущего вращения к целевому
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.2;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.2;

    // Применяем преобразования
    const transform = `
      perspective(1000px)
      rotateX(${this.rotation.x}deg)
      rotateY(${this.rotation.y}deg)
      scale3d(${this.isHovering ? 1.05 : 1}, ${this.isHovering ? 1.05 : 1}, 1)
    `;
    
    this.img.style.transform = transform;

    // Рекурсивная анимация
    requestAnimationFrame(this.animate.bind(this));
  }

  destroy() {
    // Очистка обработчиков событий
    this.container.removeEventListener('mouseenter', this.handleMouseEnter);
    this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    this.container.removeEventListener('mousemove', this.handleMouseMove);
    
    // Сброс стилей
    this.img.style.transform = '';
    this.img.style.boxShadow = '';
    this.img.style.transition = '';
  }
}

// Коллекция активных 3D эффектов
const active3DEffects = new Map();

// Функция для инициализации 3D эффектов для всех изображений
function init3DEffects() {
  // Удаляем старые эффекты
  active3DEffects.forEach((effect, img) => {
    effect.destroy();
  });
  active3DEffects.clear();

  // Создаем новые эффекты для всех изображений
  document.querySelectorAll('.grid-item img').forEach(img => {
    if (!active3DEffects.has(img)) {
      const effect = new Image3DEffect(img);
      active3DEffects.set(img, effect);
    }
  });
}

// Функция для удаления 3D эффектов
function destroy3DEffects() {
  active3DEffects.forEach((effect, img) => {
    effect.destroy();
  });
  active3DEffects.clear();
}

// Безопасный вызов masonry.layout()
function safeMasonryLayout() {
  if (masonry && typeof masonry.layout === 'function') {
    try {
      masonry.layout();
    } catch (e) {
      console.warn('Masonry layout error:', e);
    }
  }
}

// Утилита: применить размеры колонок к DOM (grid-sizer и grid-item)
function applyNumColsToGrid(cols) {
  const gridEl = document.querySelector('.grid');
  if (!gridEl) return;

  const gap = 16;
  const gridWidth = gridEl.clientWidth || gridEl.getBoundingClientRect().width || 0;
  if (!gridWidth) return;

  const availableWidth = Math.max(0, gridWidth - gap * (cols - 1));
  const colWidth = Math.floor(availableWidth / cols);

  document.querySelectorAll('.grid-sizer').forEach(el => {
    el.style.width = `${colWidth}px`;
  });
  document.querySelectorAll('.grid-item').forEach(el => {
    el.style.width = `${colWidth}px`;
  });

  if (sliderFill && sliderThumb && sizeValue) {
    const percent = ((cols - minCols) / (maxCols - minCols)) * 100;
    sliderFill.style.width = `${percent}%`;
    sliderThumb.style.left = `${percent}%`;
    sizeValue.textContent = `${cols} кол.`;
  }

  localStorage.setItem('tileScaleNumCols', String(cols));

  // Безопасный вызов masonry.layout()
  setTimeout(safeMasonryLayout, 30);
}

function updateSliderAndGrid() {
  numCols = Math.max(minCols, Math.min(maxCols, Math.round(numCols)));
  applyNumColsToGrid(numCols);
}

// Инициализация колонок
document.addEventListener('DOMContentLoaded', () => {
  const savedNumCols = parseInt(localStorage.getItem('tileScaleNumCols'));
  if (Number.isFinite(savedNumCols) && savedNumCols >= minCols && savedNumCols <= maxCols) {
    numCols = savedNumCols;
  } else {
    numCols = 3;
  }
  updateSliderAndGrid();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      applyNumColsToGrid(numCols);
    }, 100);
  });
});

// Слайдер колонок
sliderContainer?.addEventListener('mousedown', (e) => {
  const rect = sliderContainer.getBoundingClientRect();
  const totalRange = maxCols - minCols + 1;
  const stepWidth = rect.width / (totalRange - 1);

  function setFromX(x) {
    const offset = Math.max(0, Math.min(rect.width, x - rect.left));
    const stepIndex = Math.round(offset / stepWidth);
    numCols = minCols + stepIndex;
    numCols = Math.max(minCols, Math.min(maxCols, numCols));
    updateSliderAndGrid();
  }

  setFromX(e.clientX);

  function move(ev) {
    setFromX(ev.clientX);
  }

  function up() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  }

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

// Кнопки колонок
decreaseBtn?.addEventListener('click', () => {
  if (numCols > minCols) {
    numCols--;
    updateSliderAndGrid();
  }
});
increaseBtn?.addEventListener('click', () => {
  if (numCols < maxCols) {
    numCols++;
    updateSliderAndGrid();
  }
});

// ========== Загрузка галерей ==========
async function loadGalleries(filter = 'all') {
  try {
    const allGalleries = await apiFetch('/galleries');

    // Select для загрузки
    const select = document.querySelector('select[name="gallery"]');
    if (select) {
      select.innerHTML = '<option value="" disabled selected>Выберите папку</option>';
      allGalleries.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.name;
        opt.textContent = g.name;
        select.appendChild(opt);
      });
    }

    // Навигация по галереям
    const nav = document.getElementById('gallery-nav');
    if (nav) {
      nav.innerHTML = '<button data-gallery="all">Все</button>';
      allGalleries.forEach(g => {
        const btn = document.createElement('button');
        btn.dataset.gallery = g.name;
        btn.textContent = g.name;
        nav.appendChild(btn);
      });
    }

    // Очистка grid
    document.querySelectorAll('.grid-item:not(.grid-sizer)').forEach(el => el.remove());

    let images = [];
    if (filter === 'all') {
      const allImages = [];
      allGalleries.forEach(g => {
        (g.images || []).forEach(img => {
          allImages.push(Object.assign({}, img, { gallery: g.name }));
        });
      });
      const shuffled = allImages.sort(() => 0.5 - Math.random());
      images = shuffled.slice(0, itemsPerPage);
    } else if (filter === 'favorites') {
      const favorites = readFavorites();
      const allImages = [];
      allGalleries.forEach(g => {
        (g.images || []).forEach(img => {
          if (favorites.has(img.path)) {
            allImages.push(Object.assign({}, img, { gallery: g.name }));
          }
        });
      });
      images = allImages;
    } else {
      const g = allGalleries.find(x => x.name === filter);
      (g?.images || []).forEach(img => images.push(Object.assign({}, img, { gallery: g.name })));
    }

    const overrides = readOverrides();
    const favorites = readFavorites();

    // Пагинация
    const start = currentPage * itemsPerPage;
    const end = (currentPage + 1) * itemsPerPage;
    const visibleImages = images.slice(start, end);

    const fragment = document.createDocumentFragment();
    visibleImages.forEach((img, index) => {
      const displayName = overrides[img.path] || img.name || '';
      const isFavorite = favorites.has(img.path);
      const item = document.createElement('div');
      item.className = 'grid-item';
      const isExternal = img.isExternal ? 'external' : '';
      item.innerHTML = `
        <img src="${escapeHtml(img.path || '')}" 
             alt="${escapeHtml(displayName)}" 
             title="${escapeHtml(displayName)}" 
             data-name="${escapeHtml(displayName)}" 
             data-original-name="${escapeHtml(img.name || '')}" 
             data-gallery="${escapeHtml(img.gallery || '')}" 
             data-path="${escapeHtml(img.path || '')}"
             data-index="${start + index}"
             class="${isExternal}"
             loading="lazy">
        <button class="favorite-heart ${isFavorite ? 'favorited' : ''}" aria-label="Добавить в избранное">❤️</button>
        <button class="delete-btn" aria-label="Удалить">✕</button>
        <button class="rename-btn" aria-label="Переименовать">✏️</button>
        <div class="img-overlay">${escapeHtml(displayName)}</div>
        <div class="index-badge">${start + index + 1}</div>
      `;
      fragment.appendChild(item);
    });

    grid.appendChild(fragment);
    applyNumColsToGrid(numCols);

    // Инициализация 3D эффектов после загрузки изображений
    setTimeout(() => {
      init3DEffects();
    }, 100);

    // Инициализация Masonry с улучшенной обработкой ошибок
    if (masonry && typeof masonry.destroy === 'function') {
      try { 
        masonry.destroy(); 
      } catch (e) { 
        console.warn('Masonry destroy error:', e);
      }
    }
    masonry = null;

    // Даем время DOM обновиться перед инициализацией Masonry
    setTimeout(() => {
      try {
        masonry = new Masonry('.grid', {
          itemSelector: '.grid-item',
          columnWidth: '.grid-sizer',
          percentPosition: false,
          gutter: 16
        });
        
        // Отложенный layout для гарантии что все изображения загружены
        setTimeout(safeMasonryLayout, 100);
      } catch (e) {
        console.error('Masonry initialization error:', e);
        masonry = null;
      }
    }, 100);

    // Lazy loading с улучшенной обработкой
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          observer.unobserve(img);
          img.onload = () => {
            safeMasonryLayout();
            // Переинициализируем 3D эффект после загрузки изображения
            if (!active3DEffects.has(img)) {
              const effect = new Image3DEffect(img);
              active3DEffects.set(img, effect);
            }
          };
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      observer.observe(img);
    });

    updatePaginationControls(images.length);
    updateCurrentGalleryTitle(filter);
    localStorage.setItem('currentGallery', filter);
    localStorage.setItem('currentPage', String(currentPage));
  } catch (err) {
    console.error('Load galleries error:', err);
    showToast('Ошибка загрузки галерей. Проверь сервер.');
  }
}

function updateCurrentGalleryTitle(name) {
  const currentGalleryEl = document.getElementById('current-gallery-title');
  if (currentGalleryEl) {
    currentGalleryEl.textContent = name === 'all' ? 'Все изображения' : 
                                   name === 'favorites' ? 'Избранное' : name;
  }
  history.replaceState(null, '', `?gallery=${encodeURIComponent(name)}&page=${currentPage}`);
}

function updatePaginationControls(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPageNum = currentPage + 1;

  const topInfo = document.getElementById('page-info-top');
  if (topInfo) topInfo.textContent = `Страница ${currentPageNum} из ${totalPages}`;
  const prevTop = document.getElementById('prev-page-top');
  const nextTop = document.getElementById('next-page-top');
  if (prevTop) prevTop.disabled = currentPage === 0;
  if (nextTop) nextTop.disabled = currentPage >= totalPages - 1;

  const bottomInfo = document.getElementById('page-info-bottom');
  if (bottomInfo) bottomInfo.textContent = `Страница ${currentPageNum} из ${totalPages}`;
  const prevBottom = document.getElementById('prev-page-bottom');
  const nextBottom = document.getElementById('next-page-bottom');
  if (prevBottom) prevBottom.disabled = currentPage === 0;
  if (nextBottom) nextBottom.disabled = currentPage >= totalPages - 1;
}

// Пагинация
document.getElementById('prev-page-top')?.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    const gallery = localStorage.getItem('currentGallery') || 'all';
    loadGalleries(gallery);
  }
});

document.getElementById('next-page-top')?.addEventListener('click', () => {
  const gallery = localStorage.getItem('currentGallery') || 'all';
  apiFetch('/galleries')
    .then(allGalleries => {
      const totalImages = allGalleries.reduce((acc, g) => acc + (g.images?.length || 0), 0);
      const totalPages = Math.ceil(totalImages / itemsPerPage);
      if (currentPage < totalPages - 1) {
        currentPage++;
        loadGalleries(gallery);
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Не удалось получить количество изображений');
    });
});

document.getElementById('prev-page-bottom')?.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage--;
    const gallery = localStorage.getItem('currentGallery') || 'all';
    loadGalleries(gallery);
  }
});

document.getElementById('next-page-bottom')?.addEventListener('click', () => {
  const gallery = localStorage.getItem('currentGallery') || 'all';
  apiFetch('/galleries')
    .then(allGalleries => {
      const totalImages = allGalleries.reduce((acc, g) => acc + (g.images?.length || 0), 0);
      const totalPages = Math.ceil(totalImages / itemsPerPage);
      if (currentPage < totalPages - 1) {
        currentPage++;
        loadGalleries(gallery);
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Не удалось получить количество изображений');
    });
});

// Навигация по галереям
document.getElementById('gallery-nav')?.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (btn) {
    const galleryName = btn.dataset.gallery;
    localStorage.setItem('currentGallery', galleryName);
    currentPage = 0;
    loadGalleries(galleryName);
  }
});

document.getElementById('favorites-btn')?.addEventListener('click', () => {
  localStorage.setItem('currentGallery', 'favorites');
  currentPage = 0;
  loadGalleries('favorites');
});

// Загрузка изображений
document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'inline';
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: fd
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const r = await response.json();
    if (r.success) {
      showToast(`Загружено ${r.images.length}`);
      const currentFilter = localStorage.getItem('currentGallery') || 'all';
      loadGalleries(currentFilter);
      e.target.reset();
    } else {
      showToast('Ошибка: ' + (r.error || 'неизвестно'));
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка сети при загрузке');
  }
  
  if (loadingEl) loadingEl.style.display = 'none';
});

// Создание галереи
document.getElementById('create-gallery-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const name = formData.get('name');
  if (!name || !String(name).trim()) {
    showToast('Введите имя папки');
    return;
  }
  
  try {
    const data = await apiPost('/create-gallery', { name: String(name).trim() });
    if (data.success) {
      showToast(`Папка "${data.name}" создана`);
      e.target.reset();
      loadGalleries();
    } else {
      showToast('Ошибка: ' + (data.error || 'неизвестна'));
    }
  } catch (err) {
    console.error(err);
    showToast('Ошибка сети при создании папки');
  }
});

// Обработчики событий для изображений
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('favorite-heart')) {
    const parent = e.target.closest('.grid-item');
    if (!parent) return;
    const img = parent.querySelector('img');
    const path = img.dataset.path;
    const favorites = readFavorites();
    if (favorites.has(path)) {
      favorites.delete(path);
      e.target.classList.remove('favorited');
      showToast('Удалено из избранного');
    } else {
      favorites.add(path);
      e.target.classList.add('favorited');
      showToast('Добавлено в избранное');
    }
    writeFavorites(favorites);
  }
  
  if (e.target.classList.contains('rename-btn')) {
    const parent = e.target.closest('.grid-item');
    if (!parent) return;
    if (parent.querySelector('.rename-input')) return;
    const img = parent.querySelector('img');
    const current = img.dataset.name || img.dataset.originalName || '';
    const wrap = document.createElement('div');
    wrap.className = 'rename-input';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = '✓';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = '✖';
    wrap.append(input, save, cancel);
    parent.appendChild(wrap);
    input.focus();
    input.select();
    
    cancel.addEventListener('click', () => wrap.remove());
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') save.click();
      if (ev.key === 'Escape') wrap.remove();
    });
    
    save.addEventListener('click', async () => {
      const newName = input.value.trim();
      if (!newName) {
        showToast('Имя не может быть пустым');
        return;
      }
      
      try {
        await apiPost('/rename', {
          gallery: img.dataset.gallery,
          oldPath: img.dataset.path,
          newName
        });
        applyNameToElement(img, newName);
        showToast('Имя сохранено на сервере');
        wrap.remove();
      } catch (err) {
        console.warn('Rename error:', err);
        saveLocalOverride(img.dataset.path, newName);
        applyNameToElement(img, newName);
        showToast('Сетевая ошибка — имя сохранено локально');
        wrap.remove();
      }
    });
  }
  
  if (e.target.classList.contains('delete-btn')) {
    const parent = e.target.closest('.grid-item');
    const img = parent.querySelector('img');
    const path = img.dataset.path;
    const gallery = img.dataset.gallery;
    if (!path || !gallery) return;
    if (!confirm('Удалить это изображение?')) return;
    
    try {
      await apiPost('/delete-image', { gallery, path });
      
      // Удаляем 3D эффект перед удалением элемента
      if (active3DEffects.has(img)) {
        active3DEffects.get(img).destroy();
        active3DEffects.delete(img);
      }
      
      parent.remove();
      showToast('Изображение удалено');
      safeMasonryLayout();
    } catch (err) {
      console.error(err);
      showToast('Ошибка при удалении изображения');
    }
  }
});

function applyNameToElement(imgEl, newName) {
  const overlay = imgEl.parentElement.querySelector('.img-overlay');
  imgEl.dataset.name = newName;
  imgEl.title = newName;
  imgEl.alt = newName;
  if (overlay) overlay.textContent = newName;
  const modalImg = document.getElementById('modal-img');
  if (modalImg && modalImg.src === imgEl.src) {
    const cap = document.getElementById('modal-caption');
    if (cap) {
      cap.textContent = newName;
      cap.style.fontSize = '30px';
    }
  }
}

function saveLocalOverride(path, newName) {
  if (!path) return;
  const overrides = readOverrides();
  overrides[path] = newName;
  writeOverrides(overrides);
}

// ========== Модальное окно ==========
let currentImageIndex = -1;
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalCaption = document.getElementById('modal-caption');
const closeBtn = document.getElementById('close-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

function openModal(images, index) {
  currentImageIndex = index;
  const img = images[index];
  modalImg.src = img.path;
  modalImg.alt = img.alt || img.dataset.name || '';
  modalCaption.textContent = img.dataset.name || img.dataset.originalName || '';
  modalCaption.style.fontSize = '30px';
  
  const indexBadge = document.querySelector('.modal .index-badge');
  if (indexBadge) {
    indexBadge.textContent = index + 1;
  } else {
    const badge = document.createElement('div');
    badge.className = 'index-badge';
    badge.textContent = index + 1;
    modalImg.parentNode.insertBefore(badge, modalImg.nextSibling);
  }
  
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modalImg.style.transform = 'scale(1)';
  modalImg.classList.remove('loaded');
  setTimeout(() => {
    modalImg.classList.add('loaded');
  }, 10);
}

function closeModal() {
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
  currentImageIndex = -1;
}

// Открытие модалки по клику на изображение
document.addEventListener('click', e => {
  const img = e.target.closest('.grid-item img');
  if (img) {
    const items = document.querySelectorAll('.grid-item img');
    const index = Array.from(items).indexOf(img);
    const images = Array.from(items).map(el => ({
      path: el.src,
      alt: el.alt,
      dataset: el.dataset
    }));
    openModal(images, index);
  }
});

// Long press для перехода в папку
let pressTimer = null;
let startX, startY;

document.addEventListener('mousedown', (e) => {
  const img = e.target.closest('.grid-item img');
  if (!img) return;

  startX = e.clientX;
  startY = e.clientY;

  pressTimer = setTimeout(() => {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const gallery = img.dataset.gallery;
      if (gallery) {
        localStorage.setItem('currentGallery', gallery);
        currentPage = 0;
        loadGalleries(gallery);
        showToast(`Переход в папку: ${gallery}`);
      }
    }
  }, 500);
});

document.addEventListener('mouseup', () => {
  clearTimeout(pressTimer);
});

document.addEventListener('mousemove', (e) => {
  if (pressTimer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) {
    clearTimeout(pressTimer);
  }
});

// Управление клавиатурой
document.addEventListener('keydown', e => {
  if (currentImageIndex === -1) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateModal(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateModal(1);
  } else if (e.key === 'Escape') {
    closeModal();
  }
});

function navigateModal(direction) {
  const items = document.querySelectorAll('.grid-item img');
  const nextIndex = (currentImageIndex + direction + items.length) % items.length;
  const images = Array.from(items).map(el => ({
    path: el.src,
    alt: el.alt,
    dataset: el.dataset
  }));
  openModal(images, nextIndex);
}

prevBtn?.addEventListener('click', () => navigateModal(-1));
nextBtn?.addEventListener('click', () => navigateModal(1));
closeBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => {
  if (e.target.id === 'modal') {
    closeModal();
  }
});

// Тач-свайпы
let touchStartX = 0;
let touchEndX = 0;
modal?.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
modal?.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  if (diff > 50) {
    navigateModal(1);
  } else if (diff < -50) {
    navigateModal(-1);
  }
}, { passive: true });

// Вставка из буфера
document.addEventListener('paste', async (e) => {
  const items = e.clipboardData.items;
  const select = document.querySelector('select[name="gallery"]');
  const galleryValue = select?.value;

  if (!galleryValue) {
    showToast('❌ Сначала выберите папку для загрузки');
    return;
  }

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        const formData = new FormData();
        formData.append('gallery', galleryValue);
        formData.append('images', file);

        e.preventDefault();
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'inline';
        
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const r = await response.json();
          if (r.success) {
            showToast(`✅ Загружено ${r.images.length} изображений`);
            const currentFilter = localStorage.getItem('currentGallery') || 'all';
            loadGalleries(currentFilter);
            document.getElementById('upload-form').reset();
          } else {
            showToast('❌ Ошибка: ' + (r.error || 'неизвестно'));
          }
        } catch (err) {
          console.error(err);
          showToast('❌ Ошибка сети при загрузке');
        }
        
        if (loadingEl) loadingEl.style.display = 'none';
        break;
      }
    }
  }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const galleryParam = urlParams.get('gallery');
  const pageParam = parseInt(urlParams.get('page') || '0');
  const savedGallery = localStorage.getItem('currentGallery') || 'all';
  const currentGallery = galleryParam || savedGallery;
  currentPage = isNaN(pageParam) ? 0 : pageParam;

  // Восстановление состояния details
  const createDetails = document.getElementById('create-gallery-details');
  const uploadDetails = document.getElementById('upload-details');
  const galleriesDetails = document.getElementById('galleries-details');
  
  const createOpen = localStorage.getItem('createDetailsOpen') === 'true';
  const uploadOpen = localStorage.getItem('uploadDetailsOpen') === 'true';
  const galleriesOpen = localStorage.getItem('galleriesDetailsOpen') === 'true';
  
  if (createDetails) createDetails.open = createOpen;
  if (uploadDetails) uploadDetails.open = uploadOpen;
  if (galleriesDetails) galleriesDetails.open = galleriesOpen;

  createDetails?.addEventListener('toggle', () => {
    localStorage.setItem('createDetailsOpen', String(createDetails.open));
  });
  uploadDetails?.addEventListener('toggle', () => {
    localStorage.setItem('uploadDetailsOpen', String(uploadDetails.open));
  });
  galleriesDetails?.addEventListener('toggle', () => {
    localStorage.setItem('galleriesDetailsOpen', String(galleriesDetails.open));
  });

  loadGalleries(currentGallery);
});

// Обработка истории браузера
window.addEventListener('popstate', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gallery = urlParams.get('gallery') || localStorage.getItem('currentGallery') || 'all';
  const page = parseInt(urlParams.get('page') || '0');
  currentPage = isNaN(page) ? 0 : page;
  loadGalleries(gallery);
});

// Очистка при размонтировании
window.addEventListener('beforeunload', () => {
  destroy3DEffects();
});