(function () {
  'use strict';

  // --- Carousel ---
  const track = document.getElementById('carouselTrack');
  const dots = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (track && dots) {
    const slides = track.children;
    const total = slides.length;
    let current = 0;
    let interval;

    function goTo(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      current = index;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';

      Array.from(dots.children).forEach(function (dot, i) {
        dot.classList.toggle('active', i === current);
      });
    }

    function createDots() {
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', function (idx) {
          return function () { goTo(idx); resetInterval(); };
        }(i));
        dots.appendChild(dot);
      }
    }

    function resetInterval() {
      clearInterval(interval);
      interval = setInterval(function () { goTo(current + 1); }, 5000);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () { goTo(current - 1); resetInterval(); });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () { goTo(current + 1); resetInterval(); });
    }

    createDots();
    resetInterval();
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('nav a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

})();
