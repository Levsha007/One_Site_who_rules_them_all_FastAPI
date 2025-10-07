// static/js/github-app.js — GitHub профиль для FastAPI
let currentProfile = 'Levsha007'; // ← замените на свой логин!
const myUsername = 'Levsha007'; // Ваш фиксированный логин

// Переменные для навигации
let currentRepo = '';
let currentPath = '';
let pathHistory = [];

// Правильное декодирование Base64 → UTF-8 (для кириллицы!)
function decodeBase64(str) {
  try {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) {
    console.warn('Base64 decode failed:', e);
    return atob(str);
  }
}

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'java', 'cpp', 'c', 'go', 'rb'].includes(ext)) return 'code';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  return 'text';
}

function openFileModal(filename, content, type, isFileView = false) {
  const modal = document.getElementById('file-modal');
  const contentEl = document.getElementById('file-modal-content');
  const filenameEl = document.getElementById('file-modal-filename');
  
  if (!modal || !contentEl || !filenameEl) return;
  
  filenameEl.textContent = filename;

  let htmlContent = '';

  if (type === 'markdown') {
    htmlContent = simpleMarkdown(content);
  } else if (type === 'code') {
    htmlContent = `<pre><code>${escapeHtml(content)}</code></pre>`;
  } else if (type === 'image') {
    htmlContent = `<img src="${content}" alt="${filename}" style="max-width:100%;border-radius:8px;" />`;
  } else {
    htmlContent = `<pre style="white-space: pre-wrap;">${escapeHtml(content)}</pre>`;
  }

  contentEl.innerHTML = htmlContent;
  
  // Добавляем кнопку "Назад к папке" если это просмотр файла
  if (isFileView && pathHistory.length > 0) {
    const backButton = document.createElement('button');
    backButton.innerHTML = '← Назад к папке';
    backButton.style.marginBottom = '25px'; // Увеличил отступ с 15px до 25px
    backButton.style.padding = '10px 18px'; // Немного увеличил padding
    backButton.style.backgroundColor = 'var(--accent)';
    backButton.style.color = 'white';
    backButton.style.border = 'none';
    backButton.style.borderRadius = '8px';
    backButton.style.cursor = 'pointer';
    backButton.style.fontSize = '14px';
    backButton.style.fontWeight = 'bold';
    backButton.style.transition = 'background-color 0.2s, transform 0.1s';
    backButton.style.boxShadow = '0 2px 8px rgba(192, 57, 43, 0.3)';
    
    backButton.addEventListener('mouseenter', () => {
      backButton.style.backgroundColor = '#a01f1f';
      backButton.style.transform = 'translateY(-1px)';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.backgroundColor = 'var(--accent)';
      backButton.style.transform = 'translateY(0)';
    });
    
    backButton.addEventListener('click', () => {
      navigateBack();
    });
    
    // Создаем контейнер для кнопки с дополнительным отступом
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginBottom = '30px'; // Дополнительный отступ
    buttonContainer.style.padding = '10px 0'; // Вертикальный отступ
    buttonContainer.style.borderBottom = '1px solid rgba(255,255,255,0.1)'; // Разделительная линия
    buttonContainer.appendChild(backButton);
    
    contentEl.insertBefore(buttonContainer, contentEl.firstChild);
  }
  
  modal.style.display = 'flex';
  
  // Блокируем прокрутку фона
  document.body.style.overflow = 'hidden';
}

function closeFileModal() {
  const modal = document.getElementById('file-modal');
  if (modal) {
    modal.style.display = 'none';
    // Восстанавливаем прокрутку фона
    document.body.style.overflow = '';
  }
}

function simpleMarkdown(md) {
  return md
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}

// Функция для создания хлебных крошек
function createBreadcrumbs(repo, path) {
  const breadcrumbsContainer = document.createElement('div');
  breadcrumbsContainer.className = 'breadcrumbs';
  breadcrumbsContainer.style.marginBottom = '20px'; // Увеличил отступ
  breadcrumbsContainer.style.padding = '12px 15px'; // Увеличил padding
  breadcrumbsContainer.style.backgroundColor = 'rgba(255,255,255,0.05)';
  breadcrumbsContainer.style.borderRadius = '10px';
  breadcrumbsContainer.style.fontSize = '14px';
  breadcrumbsContainer.style.border = '1px solid rgba(255,255,255,0.1)';
  
  const parts = path ? path.split('/') : [];
  
  // Корневая папка репозитория
  const rootCrumb = document.createElement('span');
  rootCrumb.innerHTML = `<strong style="color: #ffd700;">📁 ${repo}</strong>`;
  rootCrumb.style.cursor = 'pointer';
  rootCrumb.style.marginRight = '8px';
  rootCrumb.style.padding = '4px 6px';
  rootCrumb.style.borderRadius = '4px';
  rootCrumb.style.transition = 'background-color 0.2s';
  rootCrumb.addEventListener('mouseenter', () => {
    rootCrumb.style.backgroundColor = 'rgba(255,215,0,0.1)';
  });
  rootCrumb.addEventListener('mouseleave', () => {
    rootCrumb.style.backgroundColor = 'transparent';
  });
  rootCrumb.addEventListener('click', () => {
    fetchAndShowFile(currentRepo, '');
  });
  breadcrumbsContainer.appendChild(rootCrumb);
  
  // Добавляем разделитель если есть путь
  if (parts.length > 0) {
    const separator = document.createElement('span');
    separator.innerHTML = ' / ';
    separator.style.margin = '0 8px';
    separator.style.color = '#888';
    breadcrumbsContainer.appendChild(separator);
  }
  
  // Добавляем промежуточные папки
  let currentPath = '';
  parts.forEach((part, index) => {
    if (part) {
      currentPath += (currentPath ? '/' : '') + part;
      
      const crumb = document.createElement('span');
      crumb.innerHTML = `<span style="color: #ffd700;">${part}</span>`;
      crumb.style.cursor = 'pointer';
      crumb.style.marginRight = '8px';
      crumb.style.padding = '4px 6px';
      crumb.style.borderRadius = '4px';
      crumb.style.transition = 'background-color 0.2s';
      crumb.addEventListener('mouseenter', () => {
        crumb.style.backgroundColor = 'rgba(255,215,0,0.1)';
      });
      crumb.addEventListener('mouseleave', () => {
        crumb.style.backgroundColor = 'transparent';
      });
      crumb.addEventListener('click', () => {
        fetchAndShowFile(currentRepo, currentPath);
      });
      breadcrumbsContainer.appendChild(crumb);
      
      // Добавляем разделитель если не последний элемент
      if (index < parts.length - 1) {
        const separator = document.createElement('span');
        separator.innerHTML = ' / ';
        separator.style.margin = '0 8px';
        separator.style.color = '#888';
        breadcrumbsContainer.appendChild(separator);
      }
    }
  });
  
  return breadcrumbsContainer;
}

async function fetchAndShowFile(fullName, path = '') {
  const [owner, repo] = fullName.split('/');
  const url = path 
    ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    : `https://api.github.com/repos/${owner}/${repo}/contents`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить');

    const data = await res.json();

    if (Array.isArray(data)) {
      // Сохраняем текущий путь для навигации
      currentRepo = fullName;
      currentPath = path;
      
      // Добавляем в историю только если это новый путь
      const currentHistoryItem = { repo: fullName, path: path };
      if (pathHistory.length === 0 || 
          pathHistory[pathHistory.length - 1].repo !== currentHistoryItem.repo || 
          pathHistory[pathHistory.length - 1].path !== currentHistoryItem.path) {
        pathHistory.push(currentHistoryItem);
      }

      // Сортируем: сначала папки, потом файлы
      const sortedData = data.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      const fileTree = document.createElement('div');
      fileTree.className = 'file-tree';
      
      // Создаем хлебные крошки
      const breadcrumbs = createBreadcrumbs(repo, path);
      fileTree.appendChild(breadcrumbs);
      
      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';
      ul.style.margin = '0';
      ul.style.maxHeight = '60vh';
      ul.style.overflowY = 'auto';
      ul.style.overflowX = 'hidden';

      sortedData.forEach(item => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        li.style.padding = '10px 14px'; // Увеличил padding
        li.style.margin = '3px 0'; // Увеличил отступ между элементами
        li.style.borderRadius = '8px';
        li.style.transition = 'background-color 0.2s, transform 0.1s';
        li.style.fontSize = '14px';
        li.style.border = '1px solid transparent';
        
        li.addEventListener('mouseenter', () => {
          li.style.backgroundColor = 'rgba(255,255,255,0.1)';
          li.style.borderColor = 'rgba(255,255,255,0.2)';
          li.style.transform = 'translateX(5px)';
        });
        li.addEventListener('mouseleave', () => {
          li.style.backgroundColor = 'transparent';
          li.style.borderColor = 'transparent';
          li.style.transform = 'translateX(0)';
        });

        if (item.type === 'dir') {
          li.innerHTML = `<span style="color: #ffd700;">📁 ${escapeHtml(item.name)}/</span>`;
          li.addEventListener('click', () => {
            fetchAndShowFile(fullName, path ? `${path}/${item.name}` : item.name);
          });
        } else {
          li.innerHTML = `<span style="color: #88ccff;">📄 ${escapeHtml(item.name)}</span>`;
          li.addEventListener('click', () => {
            // Для файлов загружаем содержимое
            fetchFileContent(fullName, path ? `${path}/${item.name}` : item.name);
          });
        }

        ul.appendChild(li);
      });

      fileTree.appendChild(ul);
      
      // Очищаем и добавляем новое содержимое
      const contentEl = document.getElementById('file-modal-content');
      contentEl.innerHTML = '';
      contentEl.style.maxHeight = '70vh';
      contentEl.style.overflowY = 'auto';
      contentEl.style.padding = '20px'; // Увеличил padding
      contentEl.appendChild(fileTree);
      
      // Обновляем заголовок модалки
      const modalTitle = path ? `${repo}/${path}` : `${repo}/`;
      document.getElementById('file-modal-filename').textContent = modalTitle;
      
      const modal = document.getElementById('file-modal');
      modal.style.display = 'flex';
      return;
    }

    // Если это файл (не массив) - обрабатываем в отдельной функции
    if (data.content) {
      fetchFileContent(fullName, path);
    }
  } catch (err) {
    console.error(err);
    openFileModal('Ошибка', 'Не удалось загрузить файл.', 'text');
  }
}

// Отдельная функция для загрузки содержимого файла
async function fetchFileContent(fullName, filePath) {
  const [owner, repo] = fullName.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить файл');

    const data = await res.json();

    if (data.content) {
      // Сохраняем путь к родительской папке файла в историю
      const directoryPath = filePath.split('/').slice(0, -1).join('/');
      const parentHistoryItem = { repo: fullName, path: directoryPath };
      
      // Добавляем родительскую папку в историю, если её там нет
      if (!pathHistory.some(item => item.repo === parentHistoryItem.repo && item.path === parentHistoryItem.path)) {
        pathHistory.push(parentHistoryItem);
      }

      const binContent = decodeBase64(data.content);
      const fileType = getFileType(data.name);

      if (fileType === 'image') {
        openFileModal(data.name, data.download_url, 'image', true);
      } else {
        openFileModal(data.name, binContent, fileType, true);
      }
    }
  } catch (err) {
    console.error(err);
    openFileModal('Ошибка', 'Не удалось загрузить файл.', 'text');
  }
}

// Функция для навигации назад - ИСПРАВЛЕННАЯ ВЕРСИЯ
function navigateBack() {
  if (pathHistory.length > 1) {
    // Удаляем текущий путь (файл или папка)
    pathHistory.pop();
    
    // Берем предыдущий путь из истории
    const previous = pathHistory[pathHistory.length - 1];
    
    // Загружаем предыдущую папку
    fetchAndShowFile(previous.repo, previous.path);
  } else if (pathHistory.length === 1) {
    // Если в истории только корень, закрываем модалку
    closeFileModal();
    // Очищаем историю
    pathHistory = [];
  }
}

async function loadGitHubData(username = currentProfile) {
  try {
    const [userRes, reposRes, starredRes, followingRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&type=public`),
      fetch(`https://api.github.com/users/${username}/starred?per_page=100`),
      fetch(`https://api.github.com/users/${username}/following?per_page=100`)
    ]);

    // Проверяем статусы ответов
    if (!userRes.ok) throw new Error(`User not found: ${userRes.status}`);
    if (!reposRes.ok) throw new Error(`Repos error: ${reposRes.status}`);
    if (!starredRes.ok) throw new Error(`Starred error: ${starredRes.status}`);
    if (!followingRes.ok) throw new Error(`Following error: ${followingRes.status}`);

    const [userData, reposData, starredData, followingData] = await Promise.all([
      userRes.json(),
      reposRes.json(),
      starredRes.json(),
      followingRes.json()
    ]);

    // Подсчитываем общее количество звёзд на всех ваших репозиториях
    const totalStarsOnMyRepos = reposData.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);

    renderProfile(userData, starredData, totalStarsOnMyRepos);
    renderPublicRepos(reposData);
    renderStarredRepos(starredData);
    renderFollowing(followingData);

    const backBtnContainer = document.getElementById('back-btn-container');
    if (backBtnContainer) {
      backBtnContainer.style.display = username !== myUsername ? 'block' : 'none';
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Не удалось загрузить данные. Возможно, такого пользователя нет.');
  }
}

function renderProfile(user, starredData, totalStarsOnMyRepos) {
  const container = document.getElementById('profile-section');
  if (!container) return;
  
  container.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">Профиль</div>
      <div class="profile-body">
        <img src="${user.avatar_url}" alt="${user.login}" style="width:100px;border-radius:50%;">
        <h2><a href="${user.html_url}" target="_blank" style="color:var(--accent);">${escapeHtml(user.login)}</a></h2>
        <p>${escapeHtml(user.name || '')}</p>
        <p>${escapeHtml(user.bio || 'Нет био')}</p>
      </div>
      <div class="profile-footer">
        <div class="stat-item">
          <div class="stat-label">Репозитории</div>
          <div class="stat-value">${user.public_repos}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Звёзды</div>
          <div class="stat-value">${starredData.length}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">⭐ Мои звёзды</div>
          <div class="stat-value">${totalStarsOnMyRepos}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Фолловеры</div>
          <div class="stat-value">${user.followers}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Фолловит</div>
          <div class="stat-value">${user.following}</div>
        </div>
      </div>
    </div>
  `;
}

function renderPublicRepos(repos) {
  const container = document.getElementById('repos-list');
  if (!container) return;
  
  container.innerHTML = '';

  repos.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'card';

    // Создаём file-tree через DOM вместо innerHTML
    const fileTree = document.createElement('div');
    fileTree.className = 'file-tree';
    
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    
    const readmeLi = document.createElement('li');
    readmeLi.innerHTML = '<span style="color: #88ccff;">📝 README.md</span>';
    readmeLi.style.cursor = 'pointer';
    readmeLi.style.padding = '10px 14px'; // Увеличил padding
    readmeLi.style.margin = '3px 0'; // Увеличил отступ
    readmeLi.style.borderRadius = '8px';
    readmeLi.style.transition = 'background-color 0.2s';
    readmeLi.style.fontSize = '14px';
    readmeLi.addEventListener('mouseenter', () => {
      readmeLi.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    readmeLi.addEventListener('mouseleave', () => {
      readmeLi.style.backgroundColor = 'transparent';
    });
    readmeLi.addEventListener('click', () => {
      fetchAndShowFile(repo.full_name, 'README.md');
    });
    ul.appendChild(readmeLi);
    
    const allFilesLi = document.createElement('li');
    allFilesLi.innerHTML = '<span style="color: #ffd700;">📁 Все файлы</span>';
    allFilesLi.style.cursor = 'pointer';
    allFilesLi.style.padding = '10px 14px'; // Увеличил padding
    allFilesLi.style.margin = '3px 0'; // Увеличил отступ
    allFilesLi.style.borderRadius = '8px';
    allFilesLi.style.transition = 'background-color 0.2s';
    allFilesLi.style.fontSize = '14px';
    allFilesLi.addEventListener('mouseenter', () => {
      allFilesLi.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    allFilesLi.addEventListener('mouseleave', () => {
      allFilesLi.style.backgroundColor = 'transparent';
    });
    allFilesLi.addEventListener('click', () => {
      fetchAndShowFile(repo.full_name, '');
    });
    ul.appendChild(allFilesLi);
    
    fileTree.appendChild(ul);

    card.innerHTML = `
      <div class="card-header">
        <a href="${repo.html_url}" target="_blank" style="color:white;text-decoration:none;">
          ${escapeHtml(repo.name)}
        </a>
      </div>
      <div class="card-body">
        ${escapeHtml(repo.description || 'Нет описания')}
      </div>
      <div class="card-footer">
        <div class="stat-item">
          <div class="stat-label">Язык</div>
          <div class="stat-value">${repo.language || '—'}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Звёзды</div>
          <div class="stat-value">${repo.stargazers_count}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Форки</div>
          <div class="stat-value">${repo.forks_count}</div>
        </div>
      </div>
    `;
    
    card.appendChild(fileTree);
    container.appendChild(card);
  });
}

function renderStarredRepos(repos) {
  const container = document.getElementById('starred-list');
  if (!container) return;
  
  container.innerHTML = '';

  repos.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'card';

    // Создаём file-tree через DOM вместо innerHTML
    const fileTree = document.createElement('div');
    fileTree.className = 'file-tree';
    
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    
    const readmeLi = document.createElement('li');
    readmeLi.innerHTML = '<span style="color: #88ccff;">📝 README.md</span>';
    readmeLi.style.cursor = 'pointer';
    readmeLi.style.padding = '10px 14px'; // Увеличил padding
    readmeLi.style.margin = '3px 0'; // Увеличил отступ
    readmeLi.style.borderRadius = '8px';
    readmeLi.style.transition = 'background-color 0.2s';
    readmeLi.style.fontSize = '14px';
    readmeLi.addEventListener('mouseenter', () => {
      readmeLi.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    readmeLi.addEventListener('mouseleave', () => {
      readmeLi.style.backgroundColor = 'transparent';
    });
    readmeLi.addEventListener('click', () => {
      fetchAndShowFile(repo.full_name, 'README.md');
    });
    ul.appendChild(readmeLi);
    
    const allFilesLi = document.createElement('li');
    allFilesLi.innerHTML = '<span style="color: #ffd700;">📁 Все файлы</span>';
    allFilesLi.style.cursor = 'pointer';
    allFilesLi.style.padding = '10px 14px'; // Увеличил padding
    allFilesLi.style.margin = '3px 0'; // Увеличил отступ
    allFilesLi.style.borderRadius = '8px';
    allFilesLi.style.transition = 'background-color 0.2s';
    allFilesLi.style.fontSize = '14px';
    allFilesLi.addEventListener('mouseenter', () => {
      allFilesLi.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    allFilesLi.addEventListener('mouseleave', () => {
      allFilesLi.style.backgroundColor = 'transparent';
    });
    allFilesLi.addEventListener('click', () => {
      fetchAndShowFile(repo.full_name, '');
    });
    ul.appendChild(allFilesLi);
    
    fileTree.appendChild(ul);

    card.innerHTML = `
      <div class="card-header">
        <a href="${repo.html_url}" target="_blank" style="color:white;text-decoration:none;">
          ${escapeHtml(repo.name)}
        </a>
      </div>
      <div class="card-body">
        ${escapeHtml(repo.description || 'Нет описания')}
        <small>Автор: <a href="${repo.owner.html_url}" target="_blank">${repo.owner.login}</a></small>
      </div>
      <div class="card-footer">
        <div class="stat-item">
          <div class="stat-label">Язык</div>
          <div class="stat-value">${repo.language || '—'}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Звёзды</div>
          <div class="stat-value">${repo.stargazers_count}</div>
        </div>
      </div>
    `;
    
    card.appendChild(fileTree);
    container.appendChild(card);
  });
}

function renderFollowing(users) {
  const container = document.getElementById('following-list');
  if (!container) return;
  
  container.innerHTML = '';

  users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'card following-card';
    card.onclick = (e) => {
      if (e.target.tagName === 'A') return;
      currentProfile = user.login;
      loadGitHubData(user.login);
    };

    card.innerHTML = `
      <div class="card-header">${escapeHtml(user.login)}</div>
      <div class="card-body">
        <img src="${user.avatar_url}" alt="${user.login}" style="width: 60px; border-radius: 50%; display: block; margin: 0 auto;">
        <p><a href="${user.html_url}" target="_blank">Перейти на профиль</a></p>
      </div>
    `;
    container.appendChild(card);
  });
}

function goBackToMyProfile() {
  currentProfile = myUsername;
  loadGitHubData(myUsername);
}

// Поиск профиля по логину
function searchUser() {
  const input = document.getElementById('search-user-input');
  if (!input) return;
  
  const username = input.value.trim();
  if (!username) {
    showToast('Введите логин');
    return;
  }
  currentProfile = username;
  loadGitHubData(username);
  input.value = ''; // очистить после поиска
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Кнопка "Главная"
  document.getElementById('home-btn')?.addEventListener('click', () => {
    window.location.href = '/';
  });

  // Обработчик поиска по Enter
  const searchInput = document.getElementById('search-user-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchUser();
      }
    });
  }

  // Закрытие модалки по клику на фон или Escape
  document.addEventListener('click', (e) => {
    if (e.target.id === 'file-modal') {
      closeFileModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFileModal();
    }
  });

  loadGitHubData();
});