// projects.js - Управление проектами Bro Code

class ProjectsManager {
    constructor() {
        this.modal = document.getElementById('project-modal');
        this.frameContainer = document.getElementById('project-frame-container');
        this.closeBtn = document.querySelector('.close-project-btn');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupTheme();
    }

    bindEvents() {
        // Обработчики для ярлыков
        document.querySelectorAll('.desktop-shortcut').forEach(shortcut => {
            shortcut.addEventListener('click', (e) => {
                const project = e.currentTarget.dataset.project;
                this.openProject(project);
            });
        });

        // Закрытие модального окна
        this.closeBtn.addEventListener('click', () => this.closeProject());
        
        // Закрытие по клику вне контента
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeProject();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeProject();
            }
        });
    }

    openProject(projectName) {
        const projectUrls = {
            'tic-tac-toe': '/projects/tic-tac-toe',
            'stopwatch': '/projects/stopwatch', 
            'clock': '/projects/clock',
            'interest-calculator': '/projects/interest-calculator',
            'dice-roller': '/projects/dice-roller',
            'password-generator': '/projects/password-generator'
        };

        const url = projectUrls[projectName];
        if (url) {
            this.frameContainer.innerHTML = `
                <iframe src="${url}" 
                        style="width: 100%; height: 100%; border: none;" 
                        title="${projectName}"
                        allow="fullscreen">
                </iframe>
            `;
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Фокус на модальном окне для работы Escape
            this.modal.focus();
        }
    }

    closeProject() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.frameContainer.innerHTML = '';
    }

    setupTheme() {
        // Используем тему из app.js
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.setAttribute('data-theme', 'light');
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new ProjectsManager();
});