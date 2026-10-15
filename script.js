/* KIO RASAN'S — Scroll Storytelling
   Animation-only update. All layout / spacing remains in the user's original CSS.
   Requires GSAP + ScrollTrigger; the site remains fully usable without them.
*/
(() => {
  // PRELOADER: actual logo bridge becomes the viewport-wide cutting line.
  // There is no replacement divider and no fade on the backdrop.
  const loader = document.getElementById('sitePreloader');
  let releaseLoader = () => {};
  const loaderDone = new Promise(resolve => { releaseLoader = resolve; });
  if (loader) {
    const bridge = loader.querySelector('.kio-preloader__bridge');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGsap = !!window.gsap;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      loader.hidden = true;
      document.body.classList.remove('kio-is-loading');
      window.kioLenis?.start?.();
      releaseLoader();
      window.ScrollTrigger?.refresh();
    };

    // The loader is already fully painted in CSS before scripts are evaluated.
    // Animate only the letters/details while keeping the bridge visible.
    let entrance = null;
    if (hasGsap && !reduced) {
      gsap.set('.kio-preloader__bridge i', {scaleX:1});
      entrance = gsap.timeline({defaults:{ease:'power3.out'}});
      entrance.from('.kio-preloader__name', {
        autoAlpha:0, y:15, duration:.53, stagger:.11
      })
    }
    const entranceDone = entrance
      ? new Promise(resolve => entrance.eventCallback('onComplete', resolve))
      : Promise.resolve();

    let exitStarted = false;
    const runExit = () => {
      if (exitStarted) return;
      exitStarted = true;
      entranceDone.then(() => {
        if (!hasGsap || reduced || !bridge) {
          // Respect reduced motion; do not introduce a fade to simulate the curtain.
          finish();
          return;
        }

        // Leave an identically sized placeholder in the logo row BEFORE moving
        // the real bridge. This prevents the logo re-centering for a single frame.
        const rect = bridge.getBoundingClientRect();
        const placeholder = document.createElement('span');
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.style.cssText = `display:block;flex:none;width:${rect.width}px;height:${rect.height}px;visibility:hidden;`;
        bridge.parentNode.insertBefore(placeholder, bridge);

        // Move the ORIGINAL line to the fixed preloader layer without changing
        // its visual position or creating any duplicate replacement line.
        gsap.set(bridge, {
          position:'fixed', left:rect.left, top:rect.top,
          width:rect.width, height:rect.height,
          margin:0, x:0, y:0, zIndex:8, autoAlpha:1
        });
        loader.appendChild(bridge);
        gsap.set(bridge.querySelector('i'), {scaleX:1});

        const curtain = gsap.timeline({
          defaults:{ease:'power3.inOut'}, onComplete:finish
        });
        curtain.to('.kio-preloader__name', {
          autoAlpha:0, duration:.26, ease:'power2.out'
        }, 0);
        
        curtain.to(bridge, {
          left:0, top:() => (window.innerHeight - rect.height)/2,
          width:() => window.innerWidth, duration:.82, ease:'power3.inOut'
        }, .08);

        // Exactly at full width: the SAME line disappears entirely, then
        // the two solid background panels move in opposite directions.
        curtain.set(bridge, {autoAlpha:0}, '>');
        curtain.to('.kio-preloader__panel--top', {
          yPercent:-101, duration:1.02
        }, '+=0.06');
        curtain.to('.kio-preloader__panel--bottom', {
          yPercent:101, duration:1.02
        }, '<');
      });
    };

    if (document.readyState === 'complete') runExit();
    else window.addEventListener('load', runExit, {once:true});
  } else {
    document.body.classList.remove('kio-is-loading');
    releaseLoader();
  }
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
  heroEnter.pause(0);
  loaderDone.then(() => heroEnter.play());
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

  // Chapter reveals start while the next stacked panel is still rising.
  const chapterTimelines = {};
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const addChapter = (selector, build) => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      build(tl);
      chapterTimelines[selector] = tl;
    };
    addChapter('.challenge', tl => tl
      .from('.challenge-copy .section-meta', { autoAlpha:0, y:15, duration:.42 })
      .from('.challenge-copy h2', { autoAlpha:0, y:40, duration:.76 }, '-=.18')
      .from('.challenge-copy p', { autoAlpha:0, y:22, duration:.55 }, '-=.35')
      .from('.challenge-copy .btn-arrow', { autoAlpha:0, y:14, duration:.5 }, '-=.29'));
    addChapter('.solution', tl => tl
      .from('.solution-copy .section-meta', { autoAlpha:0, y:16, duration:.4 })
      .from('.solution-copy h2', { autoAlpha:0, y:40, duration:.78 }, '-=.18')
      .from('.solution-copy p', { autoAlpha:0, y:22, duration:.62 }, '-=.37')
      .from('.solution-copy .btn-arrow', { autoAlpha:0, y:17, duration:.55 }, '-=.31'));
    addChapter('.services', tl => tl
      .from('.services .section-intro > *', { autoAlpha:0, y:28, duration:.56, stagger:.1 })
      .from('.services .service-card', { autoAlpha:0, y:53, duration:.66, stagger:.105 }, '-=.18')
      .from('.services .cta-row', { autoAlpha:0, y:16, duration:.48 }, '-=.2'));
    addChapter('.work', tl => tl
      .from('.work-intro > *', { autoAlpha:0, y:28, duration:.58, stagger:.105 })
      .from('.work-card', { autoAlpha:0, y:62, scale:.96, duration:.68, stagger:.13 }, '-=.32'));
    addChapter('.closing', tl => tl
      .from('.closing-center > *', { autoAlpha:0, y:36, duration:.75, stagger:.16 }));

    // Footer reveal: stays as in the existing underlay layout.
    gsap.from('.footer-col', {
      autoAlpha:0, y:25, duration:.8, stagger:.1,
      scrollTrigger: { trigger:'.footer', start:'top 88%', once:true }
    });
    return () => {
      Object.values(chapterTimelines).forEach(tl => tl.kill());
      Object.keys(chapterTimelines).forEach(k => delete chapterTimelines[k]);
    };
  });

  // Stacking panels: as the page scrolls, the NEXT panel rises and covers
  // the current pinned panel. pinSpacing:false prevents spacer gaps.
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const chapters = ['.challenge', '.solution', '.services', '.work', '.closing']
      .map(selector => $(selector))
      .filter(Boolean);
    const pins = [];
    const earlyReveals = [];
    // Start the inside animations BEFORE the panel reaches the top.
    // The panel has already entered the lower part of the viewport at this point.
    chapters.forEach((section, index) => {
      const selector = ['.challenge', '.solution', '.services', '.work', '.closing'][index];
      earlyReveals.push(ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        onEnter: () => chapterTimelines[selector]?.play(),
        onEnterBack: () => chapterTimelines[selector]?.progress(1),
        invalidateOnRefresh: true
      }));
    });

    chapters.forEach((section, index) => {
      // Section stacking order is intentional: the next chapter is on top.
      gsap.set(section, { zIndex: 10 + index });

      const next = chapters[index + 1];
      let revealCall;
      const pinConfig = {
        id: `stack-chapter-${index + 1}`,
        onEnter: () => {
          if (revealCall) revealCall.kill();
          const tl = chapterTimelines[['.challenge', '.solution', '.services', '.work', '.closing'][index]];
          if (tl && tl.progress() < 1) {
            // Fallback for jumps/direct navigation; normal reveal starts earlier.
            tl.play();
          }
        },
        onLeave: () => {
          if (revealCall) revealCall.kill();
          const tl = chapterTimelines[['.challenge', '.solution', '.services', '.work', '.closing'][index]];
          if (tl) tl.progress(1);
        },
        onEnterBack: () => {
          if (revealCall) revealCall.kill();
          const tl = chapterTimelines[['.challenge', '.solution', '.services', '.work', '.closing'][index]];
          if (tl) tl.progress(1);
        },
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
      earlyReveals.forEach(trigger => trigger.kill());
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
