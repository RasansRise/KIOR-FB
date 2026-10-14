(() => {
  // Clone the real set of logos exactly once for a seamless continuous marquee.
  const clientsTrack = document.getElementById('clientsTrack');
  if (clientsTrack) {
    const originalSet = clientsTrack.querySelector('.clients-logos');
    if (originalSet && clientsTrack.children.length === 1) {
      const duplicateSet = originalSet.cloneNode(true);
      duplicateSet.setAttribute('aria-hidden', 'true');
      clientsTrack.appendChild(duplicateSet);
    }
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const menuBtn = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? '×' : '☰';
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.textContent = '☰';
      });
    });
  }

  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const showreelBtn = document.getElementById('showreelBtn');
  if (showreelBtn) {
    showreelBtn.addEventListener('click', () => {
      document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (!window.gsap || !window.ScrollTrigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero-copy > *', {
    opacity: 0,
    y: 28,
    duration: 1,
    stagger: 0.12,
    ease: 'power3.out',
    delay: 0.15
  });

  gsap.from('.hero-visual', {
    opacity: 0,
    y: 24,
    duration: 1.1,
    ease: 'power3.out',
    delay: 0.25
  });

  gsap.utils.toArray('.reveal').forEach((el) => {
    if (el.classList.contains('hero-copy') || el.classList.contains('hero-visual')) return;
    gsap.from(el, {
      opacity: 0,
      y: 36,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        once: true
      }
    });
  });

  gsap.to('.hero-visual', {
    yPercent: 6,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1
    }
  });

  gsap.to('.solution-art', {
    yPercent: -5,
    ease: 'none',
    scrollTrigger: {
      trigger: '.solution',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1
    }
  });
})();
