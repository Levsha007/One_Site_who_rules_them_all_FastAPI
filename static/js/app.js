// static/js/app.js — общие утилиты для FastAPI
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(txt, ms = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = txt;
  t.classList.add('show');
  clearTimeout(t._hide);
  t._hide = setTimeout(() => t.classList.remove('show'), ms);
}

// === API базовые функции ===
async function apiFetch(endpoint, options = {}) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    showToast('Ошибка соединения с сервером');
    throw error;
  }
}

async function apiPost(endpoint, data) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function apiDelete(endpoint) {
  return apiFetch(endpoint, {
    method: 'DELETE',
  });
}

// === Тема ===
const themeToggle = document.getElementById('theme-toggle');
function setTheme(theme) {
  if (theme === 'dark') {
    document.body.removeAttribute('data-theme');
    if (themeToggle) themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.setAttribute('data-theme', 'light');
    if (themeToggle) themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

// Инициализация темы
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') setTheme('light');
  else setTheme('dark');

  // Обработчик переключения темы
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = localStorage.getItem('theme') || 'dark';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  // Кнопка "Главная"
  document.getElementById('home-btn')?.addEventListener('click', () => {
    window.location.href = '/';
  });
});