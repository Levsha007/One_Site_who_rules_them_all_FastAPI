// static/js/parallax-app.js

window.addEventListener('scroll', e => {
    document.documentElement.style.setProperty('--scrollTop', `${window.scrollY}px`);
});

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

ScrollSmoother.create({
    wrapper: '.wrapper',
    content: '.content'
});