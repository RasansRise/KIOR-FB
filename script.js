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

  // Infinite services carousel: one-card autoplay, seamless three-set loop.
  // Keep native touch swiping, keyboard navigation and the existing buttons.
  const serviceTrack = document.getElementById('serviceShowcaseTrack');
  if (serviceTrack) {
    const originalCards = Array.from(serviceTrack.querySelectorAll('.service-showcase__card'));
    const previous = document.querySelector('.service-showcase__prev');
    const next = document.querySelector('.service-showcase__next');
    const count = originalCards.length;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let autoTimer;
    let settleTimer;
    let currentIndex = count;
    let resetting = false;
    let hovering = false;
    let focused = false;

    if (count > 1) {
      // Duplicate a full set on both sides of the original cards. The middle
      // set serves as the invisible wrap point, so no slides visibly jump.
      const createClone = card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
        return clone;
      };
      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      originalCards.forEach(card => before.appendChild(createClone(card)));
      originalCards.forEach(card => after.appendChild(createClone(card)));
      serviceTrack.prepend(before);
      serviceTrack.append(after);
      const slides = Array.from(serviceTrack.querySelectorAll('.service-showcase__card'));
      const targetLeft = index => slides[index].offsetLeft - slides[0].offsetLeft;
      const nearestIndex = () => slides.reduce((best, card, index) =>
        Math.abs(targetLeft(index) - serviceTrack.scrollLeft) <
        Math.abs(targetLeft(best) - serviceTrack.scrollLeft) ? index : best, 0);

      const jumpTo = index => {
        resetting = true;
        const oldBehavior = serviceTrack.style.scrollBehavior;
        const oldSnap = serviceTrack.style.scrollSnapType;
        serviceTrack.style.scrollBehavior = 'auto';
        serviceTrack.style.scrollSnapType = 'none';
        serviceTrack.scrollLeft = targetLeft(index);
        currentIndex = index;
        // Restore snapping on a later frame, after the reposition has painted.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          serviceTrack.style.scrollBehavior = oldBehavior;
          serviceTrack.style.scrollSnapType = oldSnap;
          resetting = false;
        }));
      };
      const recenter = () => {
        if (resetting) return;
        currentIndex = nearestIndex();
        if (currentIndex >= count * 2) jumpTo(currentIndex - count);
        else if (currentIndex < count) jumpTo(currentIndex + count);
      };
      const step = direction => {
        if (resetting) return;
        currentIndex = nearestIndex();
        // When the user scrolls into an outer copy, normalize before advancing.
        if (currentIndex >= count * 2 || currentIndex < count) {
          const normalized = ((currentIndex % count) + count) % count + count;
          jumpTo(normalized);
          currentIndex = normalized;
        }
        const nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + direction));
        currentIndex = nextIndex;
        serviceTrack.scrollTo({
          left: targetLeft(nextIndex),
          behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });
      };
      const stopAuto = () => clearInterval(autoTimer);
      const startAuto = () => {
        stopAuto();
        if (reducedMotion.matches) return;
        autoTimer = setInterval(() => {
          if (!document.hidden && !hovering && !focused) step(1);
        }, 3400);
      };

      previous?.addEventListener('click', () => { step(-1); startAuto(); });
      next?.addEventListener('click', () => { step(1); startAuto(); });
      serviceTrack.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          step(event.key === 'ArrowRight' ? 1 : -1);
          startAuto();
        }
      });
      serviceTrack.addEventListener('scroll', () => {
        if (resetting) return;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(recenter, 180);
      }, {passive:true});
      const area = document.querySelector('.service-showcase__inner');
      area?.addEventListener('mouseenter', () => { hovering = true; });
      area?.addEventListener('mouseleave', () => { hovering = false; });
      area?.addEventListener('focusin', () => { focused = true; });
      area?.addEventListener('focusout', event => {
        if (!area.contains(event.relatedTarget)) focused = false;
      });
      serviceTrack.addEventListener('pointerdown', () => { stopAuto(); }, {passive:true});
      serviceTrack.addEventListener('pointerup', startAuto, {passive:true});
      window.addEventListener('resize', () => jumpTo(currentIndex), {passive:true});
      reducedMotion.addEventListener?.('change', startAuto);
      // Initial position is the first REAL card, visually identical to before.
      jumpTo(count);
      startAuto();
      window.addEventListener('pagehide', () => {
        stopAuto(); clearTimeout(settleTimer);
      }, {once:true});
    }
  }

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
      .from('.challenge-copy h2', { autoAlpha:0, y:36, duration:.72 }, '-=.16')
      .from('.challenge-cta', { autoAlpha:0, y:16, duration:.46 }, '-=.25')
      .from('.challenge-circle', { autoAlpha:0, scale:0.22, duration:.65, ease:'back.out(1.2)' }, '+=.04')
      .from('.challenge-figure', { autoAlpha:0, y:145, duration:.78, ease:'power3.out' }, '+=.05')
      .from('.challenge-note', {
        autoAlpha:0,
        scale:.82,
        y:() => gsap.utils.random(20, 70),
        x:() => gsap.utils.random(-22, 22),
        rotation:() => gsap.utils.random(-18, 18),
        duration:.44,
        stagger:{ each:.11, from:'random' },
        ease:'power2.out'
      }, '+=.06'));
    addChapter('.problem', tl => tl
      .from('.problem-intro h2 > span', {autoAlpha:0, y:30, duration:.64, stagger:.16})
      .from('.problem-card', {autoAlpha:0, y:35, scale:.965, duration:.7, stagger:.13}, '-=.32')
      .from('.problem-direction', {autoAlpha:0, scale:.5, duration:.4}, '-=.34'));
    addChapter('.solution', tl => tl
      .from('.metrics-copy .section-meta', {autoAlpha:0, y:14, duration:.4})
      .from('.metrics-copy h2 span', {autoAlpha:0, y:26, duration:.62, stagger:.14}, '-=.18')
      .from('.metrics-copy p, .metrics-copy .btn-arrow', {autoAlpha:0, y:16, duration:.46, stagger:.12}, '-=.3')
      .from('.metric-card', {autoAlpha:0, y:35, scale:.96, duration:.53, stagger:{each:.085,from:'start'}}, '-=.55')
      .from('.metrics-takeaway', {autoAlpha:0, y:15, duration:.5}, '-=.25'));
    addChapter('.services', tl => {
      const chartPath = document.querySelector('.process-chart__path');
      const glowPath = document.querySelector('.process-chart__glow');
      const lineLength = chartPath?.getTotalLength() || 1;
      [chartPath, glowPath].forEach(path => {
        if (path) gsap.set(path, { strokeDasharray: lineLength, strokeDashoffset: lineLength });
      });
      tl.from('.process-header .section-meta', { autoAlpha:0, y:16, duration:.4 })
        .from('.process-headline > *', { autoAlpha:0, y:22, duration:.46, stagger:.11 }, '-=.15')
        .from('.process-chart__bar', { scaleY:0, duration:.75, stagger:.18, ease:'power2.out' }, '-=.14')
        .to([chartPath, glowPath].filter(Boolean), { strokeDashoffset:0, duration:1.3, ease:'power2.inOut' }, '-=.65')
        .from('.process-chart__points circle', { autoAlpha:0, scale:0, transformOrigin:'center center', duration:.32, stagger:.15 }, '-=.7')
        .from('.process-chart__arrow', { autoAlpha:0, duration:.25 }, '-=.2')
        .from('.process-caption', { autoAlpha:0, y:18, duration:.54 }, '-=.25');
    });
    addChapter('.why-kio', tl => tl
      .from('.why-kio__content .section-meta', {autoAlpha:0, y:18, duration:.4})
      .from('.why-kio__content h2', {autoAlpha:0, y:37, duration:.75}, '-=.15')
      .from('.why-kio__content p', {autoAlpha:0, y:19, duration:.57, stagger:.13}, '-=.29')
      .from('.why-kio__button', {autoAlpha:0, y:16, duration:.53}, '-=.23'));
    addChapter('.service-showcase', tl => tl
      .from('.service-showcase__heading > *', {autoAlpha:0, y:27, duration:.56, stagger:.13})
      .from('.service-showcase__card', {autoAlpha:0, y:54, duration:.67, stagger:.09}, '-=.24')
      .from('.service-showcase__bottom', {autoAlpha:0, y:18, duration:.5}, '-=.3'));
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

  // Natural scrolling: no stacked panels or pinned ScrollTriggers.
  // Keep existing chapter timelines, but start them on entering the viewport.
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const selectors = ['.challenge', '.problem', '.solution', '.services', '.why-kio', '.service-showcase', '.work', '.closing'];
    const reveals = selectors.map(selector => {
      const section = $(selector);
      if (!section) return null;
      return ScrollTrigger.create({
        trigger: section,
        start: 'top 82%',
        onEnter: () => chapterTimelines[selector]?.play(),
        onEnterBack: () => chapterTimelines[selector]?.progress(1),
        onLeave: () => chapterTimelines[selector]?.progress(1),
        invalidateOnRefresh: true
      });
    }).filter(Boolean);
    return () => reveals.forEach(trigger => trigger.kill());
  });

  mm.add('(max-width: 860px)', () => {
    // Touch devices: short reveal sequences, no pinned sections, no horizontal animation.
    const groups = [
      ['.problem', '.problem-intro, .problem-card, .problem-direction'],
            ['.solution', '.metrics-copy, .metric-card, .metrics-takeaway'],
      ['.services', '.process-header, .process-chart, .process-caption'],
      ['.why-kio', '.why-kio__content > *'],
      ['.service-showcase', '.service-showcase__heading, .service-showcase__card, .service-showcase__bottom'],
      ['.work', '.work-intro, .work-card'],
      ['.closing', '.closing-center'],
      ['.footer', '.footer-col']
    ];
    // Challenge needs its own ordered timeline instead of a whole-art fade.
    const mobileChallenge = gsap.timeline({
      scrollTrigger: {trigger:'.challenge', start:'top 80%', once:true},
      defaults: {ease:'power3.out'}
    });
    mobileChallenge
      .from('.challenge-copy', {autoAlpha:0, y:25, duration:.52})
      .from('.challenge-circle', {autoAlpha:0, scale:.22, duration:.6, ease:'back.out(1.2)'}, '+=.05')
      .from('.challenge-figure', {autoAlpha:0, y:100, duration:.7}, '+=.04')
      .from('.challenge-note', {
        autoAlpha:0, scale:.8, y:35, duration:.4,
        stagger:{each:.1, from:'random'}, ease:'power2.out'
      }, '+=.06')
      .from('.challenge-cta', {autoAlpha:0, y:12, duration:.4}, '-=.08');
    const mobileChartPath = document.querySelector('.process-chart__path');
    const mobileGlowPath = document.querySelector('.process-chart__glow');
    if (mobileChartPath) {
      const length = mobileChartPath.getTotalLength();
      [mobileChartPath, mobileGlowPath].forEach(path => {
        if (path) gsap.set(path, { strokeDasharray:length, strokeDashoffset:length });
      });
      gsap.timeline({scrollTrigger:{trigger:'#services',start:'top 80%',once:true}})
        .from('.process-chart__bar',{scaleY:0,transformOrigin:'bottom center',duration:.65,stagger:.12})
        .to([mobileChartPath,mobileGlowPath].filter(Boolean),{strokeDashoffset:0,duration:1.05},'-=.46');
    }
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
