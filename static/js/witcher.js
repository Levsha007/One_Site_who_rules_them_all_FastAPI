// static/js/witcher.js — слайдер Witcher
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Swiper
    new Swiper('.slider', {
        speed: 2400,
        parallax: true,
        spaceBetween: 18,
        mousewheel: {
            enabled: true,
            sensitivity: 2.4
        }
    });

    // Инициализация частиц для каждого canvas
    document.querySelectorAll('.particles').forEach(canvas => {
        const color = canvas.getAttribute('data-color');
        initParticles(canvas, color);
    });
});

function initParticles(canvas, color) {
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    const numberOfParticles = 50;

    // Установка размеров canvas
    function setCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    setCanvasSize();

    // Создание частиц
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            this.color = color;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            else if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            else if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Инициализация частиц
    function init() {
        particlesArray = [];
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    // Анимация
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        requestAnimationFrame(animate);
    }

    // Обработчик ресайза
    window.addEventListener('resize', function() {
        setCanvasSize();
        init();
    });

    // Запуск
    init();
    animate();
}