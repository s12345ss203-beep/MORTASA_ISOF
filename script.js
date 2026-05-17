/* =============================================================
   MEMORIA — Portfolio scripts
   Boot, reveals, sound, cursor, scroll-spy, i18n, gallery, lightbox
   ============================================================= */

(() => {
  'use strict';

  /* ---------- BOOT SCREEN ---------- */
  const boot = document.getElementById('boot');
  const bootBar = document.getElementById('bootBar');
  const bootStatus = document.getElementById('bootStatus');
  let progress = 0;
  const tick = () => {
    progress += Math.random() * 14 + 4;
    if (progress > 100) progress = 100;
    bootBar.style.width = progress + '%';
    bootStatus.textContent = String(Math.floor(progress)).padStart(2, '0') + '%';
    if (progress < 100) {
      setTimeout(tick, 120);
    } else {
      setTimeout(() => {
        boot.classList.add('is-done');
        document.documentElement.classList.add('is-ready');
        document.body.classList.add('is-ready');
        document.getElementById('nav').classList.add('is-ready');
        revealAll();
      }, 350);
    }
  };
  setTimeout(tick, 200);

  /* ---------- IMAGE LOAD HANDLING (skeleton + fade-in) ---------- */
  const markLoaded = (img) => {
    img.classList.add('is-loaded');
    const wrap = img.closest('.card, .tile');
    if (wrap) wrap.classList.add('is-loaded');
  };
  const bindImageLoading = () => {
    document.querySelectorAll('img').forEach(img => {
      // Skip SVG icons inside nav etc — only treat <img> with src
      if (!img.src && !img.dataset.src) return;
      if (img.complete && img.naturalWidth > 0) {
        markLoaded(img);
      } else {
        img.addEventListener('load',  () => markLoaded(img), { once: true });
        img.addEventListener('error', () => {
          // Hide broken portrait/etc so wrapper bg stays clean
          if (img.classList.contains('portrait__photo')) img.style.display = 'none';
          const wrap = img.closest('.card, .tile');
          if (wrap) wrap.classList.add('is-loaded'); // remove shimmer even on error
        }, { once: true });
      }
    });
  };
  bindImageLoading();

  /* ---------- I18N — LANGUAGE TOGGLE ---------- */
  const LANG_KEY = 'mornm.lang';
  const langToggle = document.getElementById('langToggle');
  const langText = document.getElementById('langText');

  const applyLang = (lang) => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-i18n-en][data-i18n-ar]').forEach(el => {
      const en = el.getAttribute('data-i18n-en');
      const ar = el.getAttribute('data-i18n-ar');
      el.innerHTML = lang === 'ar' ? ar : en;
    });

    if (langText) langText.textContent = lang === 'ar' ? 'EN' : 'عربي';
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}

    // re-render path chart copy + axis labels for active language
    if (typeof renderPath === 'function') renderPath(currentPathIdx, true);
  };

  let currentLang = 'en';
  let currentPathIdx = 0;
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') currentLang = stored;
  } catch (_) {}

  /* ---------- REVEAL ON SCROLL ---------- */
  const reveals = document.querySelectorAll('.reveal, .reveal-up');
  reveals.forEach(el => {
    const d = el.getAttribute('data-delay');
    if (d) el.style.setProperty('--d', d);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach(el => io.observe(el));

  // Skill bars observer
  const skills = document.querySelectorAll('.skill');
  const sio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        sio.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  skills.forEach(s => sio.observe(s));

  function revealAll() {
    document.querySelectorAll('.reveal, .reveal-up').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('is-in');
      }
    });
  }

  /* ---------- SCROLL SPY ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__links a');
  // Thin trigger strip at ~38% from top of viewport — when a section
  // passes through this strip, it becomes the active one.
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(a => {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { threshold: 0, rootMargin: '-38% 0px -57% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- SOUND (Web Audio API generated) ---------- */
  let audioCtx = null;
  let sfxOn = true;
  let audioUnlocked = false;

  const ensureAudio = () => {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audioUnlocked = true;
  };

  let master, comp;
  const setupMaster = () => {
    if (!audioCtx || master) return;
    comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master = audioCtx.createGain();
    master.gain.value = 0.35;
    comp.connect(master);
    master.connect(audioCtx.destination);
  };

  const tone = ({ type='sine', freq=440, freqEnd=null, dur=0.15, gain=0.2, attack=0.005, release=0.08, filter=null, detune=0 }) => {
    if (!sfxOn || !audioCtx) return;
    setupMaster();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + release);
    let out = g;
    if (filter) {
      const f = audioCtx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.frequency || 2400;
      f.Q.value = filter.Q || 0.5;
      g.connect(f);
      out = f;
    }
    osc.connect(g);
    out.connect(comp);
    osc.start(t0);
    osc.stop(t0 + dur + release + 0.05);
  };

  const noiseBurst = ({ dur=0.25, gain=0.12, freqStart=8000, freqEnd=300 }) => {
    if (!sfxOn || !audioCtx) return;
    setupMaster();
    const t0 = audioCtx.currentTime;
    const bufferSize = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const f = audioCtx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freqStart, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 50), t0 + dur);
    f.Q.value = 0.8;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(comp);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  };

  const sfx = {
    hover() {
      tone({ type: 'sine', freq: 1100, freqEnd: 1400, dur: 0.06, gain: 0.05, attack: 0.002, release: 0.05, filter: { type:'lowpass', frequency: 3000 } });
    },
    click() {
      tone({ type: 'triangle', freq: 880, freqEnd: 440, dur: 0.08, gain: 0.13, attack: 0.001, release: 0.05 });
      tone({ type: 'square', freq: 1760, freqEnd: 660, dur: 0.05, gain: 0.04, attack: 0.001, release: 0.04, filter: { type:'highpass', frequency: 1200 } });
    },
    whoosh() {
      noiseBurst({ dur: 0.35, gain: 0.10, freqStart: 4000, freqEnd: 200 });
    },
    boot() {
      tone({ type: 'sawtooth', freq: 220, freqEnd: 880, dur: 0.45, gain: 0.08, attack: 0.01, release: 0.2, filter: { type:'lowpass', frequency: 2000 } });
    },
  };

  const bindSfx = (root = document) => {
    root.querySelectorAll('[data-sfx]').forEach(el => {
      const type = el.getAttribute('data-sfx');
      if (type === 'hover') {
        el.addEventListener('mouseenter', () => sfx.hover());
      }
      if (type === 'click') {
        el.addEventListener('mouseenter', () => sfx.hover());
        el.addEventListener('click', () => sfx.click());
      }
    });
  };
  bindSfx();

  const unlock = () => {
    ensureAudio();
    setupMaster();
    sfx.boot();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  const soundBtn = document.getElementById('soundToggle');
  soundBtn.addEventListener('click', () => {
    sfxOn = !sfxOn;
    soundBtn.classList.toggle('is-off', !sfxOn);
    soundBtn.querySelector('.nav__sound-text').textContent = sfxOn ? 'SFX · ON' : 'SFX · OFF';
    if (sfxOn) sfx.click();
  });

  /* ---------- SECTION WHOOSH on scroll ---------- */
  let lastSection = null;
  const whooshObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.target.id !== lastSection) {
        lastSection = e.target.id;
        if (audioUnlocked) sfx.whoosh();
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => whooshObserver.observe(s));

  /* ---------- CUSTOM CURSOR ---------- */
  const cursor = document.getElementById('cursor');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.querySelector('.cursor__dot').style.left = mx + 'px';
      cursor.querySelector('.cursor__dot').style.top = my + 'px';
    });

    const followLoop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      const ring = cursor.querySelector('.cursor__ring');
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(followLoop);
    };
    followLoop();

    document.querySelectorAll('a, button, .chip, .skill, .card, .portrait').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ---------- MOBILE NAV ---------- */
  const burger = document.getElementById('burger');
  const navEl = document.getElementById('nav');
  burger.addEventListener('click', () => {
    navEl.classList.toggle('is-open');
    sfx.click();
  });
  navEl.querySelectorAll('.nav__links a').forEach(a => {
    a.addEventListener('click', () => navEl.classList.remove('is-open'));
  });

  /* ---------- PARALLAX (portrait + kanji) ---------- */
  const portrait = document.querySelector('.portrait');
  const portraitKanji = document.querySelector('.portrait__kanji');
  if (portrait) {
    window.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      portrait.style.transform = `translate3d(${dx * 14}px, ${dy * 10}px, 0)`;
      if (portraitKanji) portraitKanji.style.transform = `translate3d(${dx * 30}px, ${dy * 20}px, 0)`;
    });
  }

  /* ---------- SCROLL PARALLAX for kanji column ---------- */
  const kanjiCol = document.querySelector('.kanji-column');
  if (kanjiCol) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY * 0.15;
      kanjiCol.style.transform = `translateY(calc(-50% + ${-y}px))`;
    }, { passive: true });
  }

  /* ---------- HUD CLOCK ---------- */
  const clock = document.getElementById('hudClock');
  if (clock) {
    const updateClock = () => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} BGT`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ---------- SMOOTH ANCHOR SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---------- GALLERY — show more / show less ---------- */
  const gallery = document.getElementById('gallery');
  const moreBtn = document.getElementById('moreBtn');
  const moreLabel = document.getElementById('moreLabel');
  const visibleCount = document.getElementById('visibleCount');
  const totalCount = document.getElementById('totalCount');

  if (gallery && moreBtn) {
    const allCards = gallery.querySelectorAll('.card');
    const visibleByDefault = gallery.querySelectorAll('.card:not(.is-extra)').length;
    if (totalCount) totalCount.textContent = allCards.length;
    if (visibleCount) visibleCount.textContent = visibleByDefault;

    const extraCount = allCards.length - visibleByDefault;
    const labelMore = {
      en: `Show all (+${extraCount})`,
      ar: `عرض الكل (+${extraCount})`
    };
    const labelLess = { en: 'Show less', ar: 'عرض أقل' };

    moreBtn.addEventListener('click', () => {
      const expanded = gallery.classList.toggle('is-expanded');
      if (visibleCount) visibleCount.textContent = expanded ? allCards.length : visibleByDefault;

      const isAr = document.documentElement.getAttribute('lang') === 'ar';
      const pair = expanded ? labelLess : labelMore;
      moreLabel.setAttribute('data-i18n-en', pair.en);
      moreLabel.setAttribute('data-i18n-ar', pair.ar);
      moreLabel.textContent = isAr ? pair.ar : pair.en;

      if (!expanded) {
        document.getElementById('projects').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // Rebind cursor hover for the newly-shown cards (they were display:none before)
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        gallery.querySelectorAll('.card.is-extra').forEach(el => {
          if (!el.dataset.cursorBound) {
            el.dataset.cursorBound = '1';
            el.addEventListener('mouseenter', () => cursor && cursor.classList.add('is-hover'));
            el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('is-hover'));
          }
        });
      }
    });
  }

  /* ---------- LIGHTBOX ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCap = document.getElementById('lightboxCap');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let lbIndex = 0;
  const lbCards = () => Array.from(gallery ? gallery.querySelectorAll('.card') : []);

  const openLightbox = (idx) => {
    const cards = lbCards();
    if (!cards.length) return;
    lbIndex = (idx + cards.length) % cards.length;
    const card = cards[lbIndex];
    const img = card.querySelector('img');
    const id = card.querySelector('.card__id');
    // Always show full-res in the lightbox, regardless of which srcset
    // candidate was picked for the thumbnail.
    const fullSrc = (img && img.dataset && img.dataset.fullsrc) || (img && img.currentSrc) || (img && img.src) || '';
    lightboxImg.removeAttribute('srcset'); // ensure browser uses the chosen src
    lightboxImg.src = fullSrc;
    lightboxImg.alt = img ? img.alt : '';
    lightboxCap.textContent = id ? id.textContent : '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (gallery) {
    gallery.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const cards = lbCards();
      const idx = cards.indexOf(card);
      if (idx === -1) return;
      sfx.click();
      openLightbox(idx);
    });
  }
  if (lightboxClose) lightboxClose.addEventListener('click', () => { sfx.click(); closeLightbox(); });
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => { sfx.click(); openLightbox(lbIndex - 1); });
  if (lightboxNext) lightboxNext.addEventListener('click', () => { sfx.click(); openLightbox(lbIndex + 1); });
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') openLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') openLightbox(lbIndex + 1);
  });

  /* ---------- PATH CHART ---------- */
  const pathCategories = {
    en: ['Design', 'Video', 'Adobe', 'Code', '3D'],
    ar: ['تصميم', 'فيديو', 'أدوبي', 'برمجة', 'ثلاثي']
  };
  const pathX = [100, 210, 320, 430, 540];

  const pathData = [
    {
      yearLabel: '2019 — 2022',
      title_en: 'Phone era — first sparks',
      title_ar: 'فترة الجوال — أول الشرارات',
      text_en: 'Got curious about design. Opened a design app on my phone and started messing around. Did some casual video cuts on the same screen. Nothing serious yet — just learning by breaking things.',
      text_ar: 'صرت فضولي بالتصميم. فتحت تطبيق على الموبايل وبلشت ألعب بيه. سويت قصات فيديو خفيفة على نفس الجهاز. ما شي جدّي — كنت أتعلم بطريقة ألخبط الملفات.',
      bullets_en: ['Mobile design apps', 'Casual phone edits', 'Re-watched anime intros a lot'],
      bullets_ar: ['تطبيقات تصميم على الموبايل', 'مونتاج خفيف على الجوال', 'إعادة إنتروهات أنمي بكميات'],
      levels: [15, 10, 0, 0, 0]
    },
    {
      yearLabel: '2022 — 2024',
      title_en: 'Getting fluent on the small screen',
      title_ar: 'الإتقان من الشاشة الصغيرة',
      text_en: 'The phone became my whole studio. I could pull off most kinds of design on it, and my video edits started looking clean. Began peeking at the desktop tools at the end.',
      text_ar: 'الجوال صار الستوديو كله. صرت أقدر أسوي معظم أنواع التصميم عليه، ومونتاج الفيديو بدأ يطلع نظيف. وبأواخر الفترة بلشت أطل على برامج الكمبيوتر.',
      bullets_en: ['Phone design — most categories', 'Confident video editing', 'First peeks at desktop tools'],
      bullets_ar: ['تصميم جوال — أغلب الأنواع', 'مونتاج فيديو بثقة', 'أول إطلالة على برامج الديسكتوب'],
      levels: [55, 50, 10, 0, 0]
    },
    {
      yearLabel: '2024 — 2026',
      title_en: 'PC, Adobe, and the code rabbit hole',
      title_ar: 'الكمبيوتر، أدوبي، وحفرة الكود',
      text_en: 'Moved to a real PC. Started taking Adobe seriously — Photoshop, Illustrator, After Effects, Premiere. Began learning to code: HTML, CSS, JS, a bit of C++. Touched Blender on the side.',
      text_ar: 'انتقلت إلى كمبيوتر حقيقي. أخذت أدوبي بجدية — فوتوشوب، إلستريتر، أفتر إفكتس، بريمير. وبلشت أتعلم البرمجة: HTML و CSS و JS وشوية C++. ولمست بلندر بعد.',
      bullets_en: ['Adobe suite — daily driver', 'Web code basics + a little C++', 'First Blender experiments'],
      bullets_ar: ['حزمة أدوبي — يومياً', 'أساسيات الويب وشوية C++', 'أول تجارب على بلندر'],
      levels: [85, 60, 80, 55, 30]
    }
  ];

  const pathY = (lvl) => 320 - lvl * 2.8;

  const lineEl  = document.querySelector('.path__line');
  const glowEl  = document.querySelector('.path__glow');
  const areaEl  = document.querySelector('.path__area');
  const ptEls   = document.querySelectorAll('.path__pt');
  const valEls  = document.querySelectorAll('.path__val');
  const xLabels = document.querySelectorAll('.path__xlabel');
  const pathTabs = document.querySelectorAll('.path__tab');
  const pathYearEl   = document.getElementById('pathYear');
  const pathTitleEl  = document.getElementById('pathTitle');
  const pathTextEl   = document.getElementById('pathText');
  const pathBulletsEl = document.getElementById('pathBullets');

  function renderPath(idx, skipLineAnim) {
    if (!lineEl) return;
    currentPathIdx = idx;
    const d = pathData[idx];
    const isAr = document.documentElement.getAttribute('lang') === 'ar';

    // 1) recompute points
    const pointsStr = d.levels.map((lv, i) => `${pathX[i]},${pathY(lv)}`).join(' ');
    const areaStr = `${pathX[0]},320 ${pointsStr} ${pathX[pathX.length-1]},320`;

    lineEl.setAttribute('points', pointsStr);
    glowEl.setAttribute('points', pointsStr);
    areaEl.setAttribute('points', areaStr);

    // 2) re-trigger draw-on (stroke-dashoffset) animation
    if (!skipLineAnim) {
      const len = lineEl.getTotalLength();
      lineEl.style.transition = 'none';
      lineEl.style.strokeDasharray = len;
      lineEl.style.strokeDashoffset = len;
      // force reflow
      void lineEl.getBoundingClientRect();
      lineEl.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.2,.7,.2,1)';
      lineEl.style.strokeDashoffset = 0;
    }

    // 3) move circles + value labels (CSS handles transition)
    ptEls.forEach((c, i) => {
      c.setAttribute('cx', pathX[i]);
      c.setAttribute('cy', pathY(d.levels[i]));
    });
    valEls.forEach((t, i) => {
      t.setAttribute('x', pathX[i]);
      t.setAttribute('y', pathY(d.levels[i]) - 14);
      t.textContent = d.levels[i];
    });

    // 4) update axis category labels for current language
    const cats = isAr ? pathCategories.ar : pathCategories.en;
    xLabels.forEach((t, i) => { t.textContent = cats[i]; });

    // 5) description text + bullets
    if (pathYearEl)  pathYearEl.textContent  = d.yearLabel;
    if (pathTitleEl) pathTitleEl.textContent = isAr ? d.title_ar : d.title_en;
    if (pathTextEl)  pathTextEl.textContent  = isAr ? d.text_ar  : d.text_en;
    if (pathBulletsEl) {
      pathBulletsEl.innerHTML = '';
      const bullets = isAr ? d.bullets_ar : d.bullets_en;
      bullets.forEach(b => {
        const li = document.createElement('li');
        li.textContent = b;
        pathBulletsEl.appendChild(li);
      });
    }

    // 6) tab active state
    pathTabs.forEach((tab, i) => tab.classList.toggle('is-active', i === idx));

    // 7) tiny "swap" animation on desc panel
    const desc = document.querySelector('.path__desc');
    if (desc) {
      desc.classList.remove('is-changing');
      void desc.offsetWidth;
      desc.classList.add('is-changing');
    }
  }

  pathTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => renderPath(i));
  });

  /* ---------- Stagger index for gallery extras (for animation) ---------- */
  if (gallery) {
    gallery.querySelectorAll('.card.is-extra').forEach((card, i) => {
      card.style.setProperty('--idx', i);
    });
  }

  /* ---------- DEFERRED: now we can call applyLang + render path safely ---------- */
  applyLang(currentLang);
  // initial path render (skip the line draw-in to let layout settle, then animate on first tab)
  renderPath(currentPathIdx, true);
  // animate the initial line draw on first IntersectionObserver hit
  const pathSec = document.getElementById('timeline');
  if (pathSec && lineEl) {
    let drawnOnce = false;
    const drawObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !drawnOnce) {
          drawnOnce = true;
          renderPath(currentPathIdx, false);
          drawObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    drawObs.observe(pathSec);
  }

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      currentLang = currentLang === 'ar' ? 'en' : 'ar';
      applyLang(currentLang);
    });
  }

})();
