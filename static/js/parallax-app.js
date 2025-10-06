// static/js/parallax-app.js — параллакс эффекты для FastAPI

// Обработка скролла для параллакс эффектов
window.addEventListener('scroll', e => {
  document.documentElement.style.setProperty('--scrollTop', `${window.scrollY}px`);
});

// Инициализация GSAP плагинов и ScrollSmoother
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем, загружены ли GSAP плагины
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof ScrollSmoother !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
      
      // Инициализация плавного скролла
      try {
          ScrollSmoother.create({
              wrapper: '.wrapper',
              content: '.content',
              smooth: 1.5,
              effects: true,
              normalizeScroll: true
          });
          
          console.log('ScrollSmoother успешно инициализирован');
      } catch (error) {
          console.error('Ошибка инициализации ScrollSmoother:', error);
      }
      
      // Дополнительные параллакс эффекты для слоёв
      gsap.to('.layers__base', {
          y: '-30%',
          ease: 'none',
          scrollTrigger: {
              trigger: '.main-header',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
          }
      });
      
      gsap.to('.layers__middle', {
          y: '-15%',
          ease: 'none',
          scrollTrigger: {
              trigger: '.main-header',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
          }
      });
      
      gsap.to('.layers__front', {
          y: '-5%',
          ease: 'none',
          scrollTrigger: {
              trigger: '.main-header',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
          }
      });
      
      // Анимация для заголовка
      gsap.to('.layer__header', {
          opacity: 0,
          y: -100,
          ease: 'none',
          scrollTrigger: {
              trigger: '.main-header',
              start: 'top top',
              end: 'bottom top',
              scrub: true
          }
      });
      
  } else {
      console.warn('GSAP плагины не загружены. Проверьте подключение библиотек.');
  }
});

// Fallback для случаев, когда GSAP не загружен
window.addEventListener('load', () => {
  if (typeof gsap === 'undefined') {
      console.warn('GSAP не загружен. Параллакс эффекты недоступны.');
      
      // Простой fallback для базового параллакса
      const layers = document.querySelectorAll('.layer');
      if (layers.length > 0) {
          window.addEventListener('scroll', () => {
              const scrolled = window.pageYOffset;
              const rate = scrolled * -0.5;
              
              layers.forEach((layer, index) => {
                  const speed = 1 - (index * 0.2);
                  layer.style.transform = `translateY(${rate * speed}px)`;
              });
          });
      }
  }
});

// Обработка ресайза окна
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
      // Обновление ScrollTrigger при изменении размера окна
      if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
      }
  }, 250);
});