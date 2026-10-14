/* KIO RASAN'S — Scroll Storytelling
   Animation-only update. All layout / spacing remains in the user's original CSS.
   Requires GSAP + ScrollTrigger; the site remains fully usable without them.
*/
(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const track = $('#clientsTrack');
  if (track) {
    const first = $('.clients-logos', track);
    if (first && track.children.length === 1) {
      const clone = first.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
  const menu = $('.menu-toggle');
  const nav = $('.nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const opened = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(opened));
      menu.textContent = opened ? '×' : '☰';
    });
    $$('a', nav).forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
      menu.textContent = '☰';
    }));
  }
  const header = $('#siteHeader');
  const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });
  $('#showreelBtn')?.addEventListener('click', () => {
    if (window.kioLenis) window.kioLenis.scrollTo('#portfolio', { offset: -88 });
    else $('#portfolio')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Subtle reading-progress line with no added section spacing.
  const progress = document.createElement('div');
  progress.className = 'story-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  document.body.appendChild(progress);

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  // Smooth inertia is only applied to desktop mouse/trackpad scrolling.
  // ScrollTrigger still controls every existing pinned/stacking panel.
  const smoothDesktop = window.matchMedia('(min-width: 861px) and (prefers-reduced-motion: no-preference)').matches;
  let lenis = null;
  if (smoothDesktop && window.Lenis) {
    lenis = new Lenis({
      duration: 1.45,
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1,
      syncTouch: false,
      autoRaf: false,
      anchors: { offset: -88 }
    });
    window.kioLenis = lenis;
    document.documentElement.classList.add('has-smooth-scroll');
    lenis.on('scroll', ScrollTrigger.update);
    const tickLenis = time => lenis.raf(time * 1000);
    gsap.ticker.add(tickLenis);
    gsap.ticker.lagSmoothing(0);
    window.addEventListener('pagehide', () => {
      gsap.ticker.remove(tickLenis);
      lenis.destroy();
    }, { once: true });
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    progress.remove();
    return;
  }

  gsap.to(progress.firstElementChild, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: .2 }
  });

  // Track navigation through story chapters without touching links or anchors.
  const chapterLinks = $$('.nav a[href^="#"]');
  chapterLinks.forEach(link => {
    const target = $(link.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 42%',
      end: 'bottom 42%',
      onToggle: self => {
        if (self.isActive) chapterLinks.forEach(a => a.classList.toggle('active', a === link));
      }
    });
  });

  // The footer sits below the storytelling canvas; reserve an exact reveal
  // runway after Closing so the last section lifts and uncovers it.
  const updateFooterRevealHeight = () => {
    const footer = $('.footer');
    if (!footer) return;
    document.documentElement.style.setProperty('--footer-reveal-height', `${Math.ceil(footer.getBoundingClientRect().height)}px`);
  };
  updateFooterRevealHeight();
  window.addEventListener('resize', updateFooterRevealHeight, { passive:true });
  document.fonts?.ready.then(() => {updateFooterRevealHeight(); ScrollTrigger.refresh();});

  const mm = gsap.matchMedia();
  // Cinematic first frame. Hero BACKGROUND is never moved: only independent HTML overlays.
  const heroEnter = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroEnter
    .from('.site-header .brand, .site-header .nav', { autoAlpha: 0, y: -14, duration: .85, stagger: .1 })
    .from('.hero-copy .eyebrow', { autoAlpha: 0, y: 18, duration: .65 }, '-=.45')
    .from('.hero-copy h1 > span', { autoAlpha: 0, y: 32, stagger: .105, duration: .78 }, '-=.36')
    .from('.hero-copy p', { autoAlpha: 0, y: 18, duration: .66 }, '-=.26')
    .from('.hero-copy .btn-arrow', { autoAlpha: 0, y: 16, duration: .65 }, '-=.35')
    .from('.hero-showreel', { autoAlpha: 0, y: 20, duration: .74 }, '-=.5');

  // Client marquee continues its original infinite CSS loop. Only its first appearance animates.
  gsap.from('.clients-strip', {
    autoAlpha: 0, duration: .75, ease: 'power2.out',
    scrollTrigger: { trigger: '.clients-strip', start: 'top 93%', once: true }
  });

  mm.add('(min-width: 861px)', () => {
    // Challenge: notes enter in sequence as the chapter arrives, artwork itself remains anchored.
    const challenge = gsap.timeline({
      scrollTrigger: { trigger: '.challenge', start: 'top 78%', end: 'top 12%', scrub: .85 }
    });
    challenge
      .from('.challenge-art', { autoAlpha: 0, x: -60, duration: .45, ease: 'none' }, 0)
      .from('.challenge-copy .section-meta', { autoAlpha: 0, y: 16, duration: .2 }, .10)
      .from('.challenge-copy h2', { autoAlpha: 0, y: 36, duration: .38 }, .15)
      .from('.challenge-copy p, .challenge-copy .btn-arrow', { autoAlpha: 0, y: 18, stagger: .14, duration: .25 }, .37)
      .from('.challenge-note', { autoAlpha: 0, y: 40, rotation: -6, stagger: .065, duration: .22 }, .2);

    // Chapter pins are registered below together, so each scene holds its frame.
    // Services: visual rhythm without pinning or altering existing grid/spacing.
    gsap.from('.services .section-intro > *', {
      autoAlpha: 0, y: 25, stagger: .1, duration: .8,
      scrollTrigger: { trigger: '.services', start: 'top 76%', once: true }
    });
    gsap.from('.service-card', {
      autoAlpha: 0, y: 66, rotateY: -7, stagger: .12, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: '.services-grid', start: 'top 87%', once: true }
    });

    gsap.from('.work-intro > *', {
      autoAlpha: 0, x: 35, stagger: .09, duration: .85,
      scrollTrigger: { trigger: '.work', start: 'top 79%', once: true }
    });
    gsap.from('.work-card', {
      autoAlpha: 0, y: 75, scale: .95, stagger: .14, duration: .92, ease: 'power3.out',
      scrollTrigger: { trigger: '.work-grid', start: 'top 87%', once: true }
    });

    gsap.from('.closing-center > *', {
      autoAlpha: 0, y: 32, stagger: .16, duration: .85,
      scrollTrigger: { trigger: '.closing', start: 'top 73%', once: true }
    });
    gsap.from('.footer-col', {
      autoAlpha: 0, y: 25, stagger: .1, duration: .8,
      scrollTrigger: { trigger: '.footer', start: 'top 88%', once: true }
    });
  });

  // Stacking panels: as the page scrolls, the NEXT panel rises and covers
  // the current pinned panel. pinSpacing:false prevents spacer gaps.
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const chapters = ['.challenge', '.solution', '.services', '.work', '.closing']
      .map(selector => $(selector))
      .filter(Boolean);
    const pins = [];

    chapters.forEach((section, index) => {
      // Section stacking order is intentional: the next chapter is on top.
      gsap.set(section, { zIndex: 10 + index });

      const next = chapters[index + 1];
      const pinConfig = {
        id: `stack-chapter-${index + 1}`,
        trigger: section,
        start: 'top top',
        pin: true,
        pinSpacing: false,
        pinReparent: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: chapters.length - index,
      };

      if (next) {
        // Keep the current scene fixed until the next has slid fully over it.
        pinConfig.endTrigger = next;
        pinConfig.end = 'top top';
      } else {
        // Short final hold, then the closing scrolls away to reveal the footer.
        pinConfig.end = () => `+=${Math.round(window.innerHeight * .65)}`;
        pinConfig.pinSpacing = true;
      }

      pins.push(ScrollTrigger.create(pinConfig));
    });

    return () => {
      pins.forEach(pin => pin.kill());
      chapters.forEach(section => gsap.set(section, { clearProps: 'zIndex' }));
    };
  });

  // Footer stays in document flow, below main and below its stacking layer.
  // This prevents it being visible during pin-spacer gaps.

  mm.add('(max-width: 860px)', () => {
    // Touch devices: short reveal sequences, no pinned sections, no horizontal animation.
    const groups = [
      ['.challenge', '.challenge-copy, .challenge-art'],
      ['.solution', '.solution-copy'],
      ['.services', '.section-intro, .service-card'],
      ['.work', '.work-intro, .work-card'],
      ['.closing', '.closing-center'],
      ['.footer', '.footer-col']
    ];
    groups.forEach(([chapter, elements]) => {
      gsap.from($$(elements, $(chapter)), {
        autoAlpha: 0, y: 20, stagger: .08, duration: .65,
        ease: 'power2.out',
        scrollTrigger: { trigger: chapter, start: 'top 83%', once: true }
      });
    });
  });

  // Correct positions after image loads / font swapping, particularly the pinned chapter.
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
