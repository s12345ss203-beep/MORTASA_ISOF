/* =============================================================
   MEMORIA — Portfolio scripts
   Boot, i18n, reveals, scroll progress, sound, cursor, member card,
   film reel, archive filter, lightbox, path chart
   ============================================================= */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isRtl = () => document.documentElement.getAttribute('dir') === 'rtl';
  const isAr = () => document.documentElement.getAttribute('lang') === 'ar';
  const pad = (n, len = 2) => String(n).padStart(len, '0');

  /* ---------- BOOT SCREEN ---------- */
  // Full sequence once per browser session; later page loads (or reduced
  // motion) skip straight to the content so the boot never gets in the way.
  const BOOT_KEY = 'mornm.booted';
  const boot = document.getElementById('boot');
  const bootBar = document.getElementById('bootBar');
  const bootStatus = document.getElementById('bootStatus');
  let bootSeen = false;
  try { bootSeen = sessionStorage.getItem(BOOT_KEY) === '1'; } catch (_) {}

  const finishBoot = () => {
    boot.classList.add('is-done');
    document.documentElement.classList.add('is-ready');
    document.body.classList.add('is-ready');
    document.getElementById('nav').classList.add('is-ready');
    try { sessionStorage.setItem(BOOT_KEY, '1'); } catch (_) {}
    revealAll();
    layoutProgress();
  };

  let progress = 0;
  const tick = () => {
    progress += Math.random() * 18 + 8;
    if (progress > 100) progress = 100;
    bootBar.style.width = progress + '%';
    bootStatus.textContent = pad(Math.floor(progress)) + '%';
    if (progress < 100) {
      setTimeout(tick, 89);
    } else {
      setTimeout(finishBoot, 233);
    }
  };
  if (bootSeen || reducedMotion) {
    bootBar.style.width = '100%';
    bootStatus.textContent = '100%';
    requestAnimationFrame(finishBoot);
  } else {
    setTimeout(tick, 144);
  }

  /* ---------- IMAGE LOAD HANDLING (skeleton + auto-fallback) ---------- */
  const markLoaded = (img) => {
    img.classList.add('is-loaded');
    const wrap = img.closest('.reel__frame-thumb, .ep-card-thumb');
    if (wrap) wrap.classList.add('is-loaded');
  };
  // If a srcset candidate 404s, retry once with data-fullsrc; then give up quietly.
  const tryFallback = (img) => {
    const wrap = img.closest('.reel__frame-thumb, .ep-card-thumb');
    if (img.dataset.tried) {
      if (img.classList.contains('portrait__photo')) img.style.display = 'none';
      if (wrap) wrap.classList.add('is-loaded');
      return;
    }
    img.dataset.tried = '1';
    img.removeAttribute('srcset');
    if (img.dataset.fullsrc) img.src = img.dataset.fullsrc;
    else if (wrap) wrap.classList.add('is-loaded');
  };
  const bindImage = (img) => {
    if (!img.getAttribute('src')) return;
    if (img.complete && img.naturalWidth > 0) markLoaded(img);
    else if (img.complete) tryFallback(img);
    else {
      img.addEventListener('load', () => markLoaded(img), { once: true });
      img.addEventListener('error', () => tryFallback(img));
    }
  };
  document.querySelectorAll('img').forEach(bindImage);

  /* ---------- I18N — LANGUAGE TOGGLE ---------- */
  const LANG_KEY = 'mornm.lang';
  const langToggle = document.getElementById('langToggle');
  const langText = document.getElementById('langText');

  const applyLang = (lang) => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-i18n-en][data-i18n-ar]').forEach(el => {
      el.innerHTML = lang === 'ar' ? el.getAttribute('data-i18n-ar') : el.getAttribute('data-i18n-en');
    });

    if (langText) langText.textContent = lang === 'ar' ? 'EN' : 'عربي';
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}

    // components that build their own copy listen for this
    document.dispatchEvent(new CustomEvent('mornm:lang', { detail: lang }));
    layoutProgress();
  };

  let currentLang = 'en';
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
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  reveals.forEach(el => io.observe(el));

  const sio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); sio.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.skill').forEach(s => sio.observe(s));

  function revealAll() {
    document.querySelectorAll('.reveal, .reveal-up').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
  }

  /* ---------- SCROLL SPY ---------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { threshold: 0, rootMargin: '-38.2% 0px -61.8% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- SCROLL PROGRESS + STAGE COUNTER ---------- */
  const progressTrack = document.getElementById('progressTrack');
  const progressFill = document.getElementById('progressFill');
  const progressMark = document.getElementById('progressMark');
  const progressStage = document.getElementById('progressStage');
  const stages = Array.from(document.querySelectorAll('section[data-stage]'));
  const totalStages = stages.length;
  let ticks = [];

  // one tick per stage, placed where that section starts in the page
  function layoutProgress() {
    if (!progressTrack) return;
    ticks.forEach(t => t.remove());
    const max = document.documentElement.scrollHeight - window.innerHeight;
    ticks = stages.map(sec => {
      const t = document.createElement('span');
      t.className = 'progress__tick';
      const at = Math.min(1, Math.max(0, (sec.offsetTop - window.innerHeight * 0.382) / max));
      t.style.insetInlineStart = (at * 100) + '%';
      t.dataset.at = at;
      progressTrack.appendChild(t);
      return t;
    });
    updateProgress();
  }

  let progressQueued = false;
  function updateProgress() {
    progressQueued = false;
    if (!progressTrack) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressFill.style.width = (p * 100) + '%';
    progressMark.style.insetInlineStart = (p * 100) + '%';
    let current = 0;
    ticks.forEach((t, i) => {
      const passed = p >= parseFloat(t.dataset.at) - 0.001;
      t.classList.toggle('is-passed', passed);
      if (passed) current = i + 1;
    });
    progressStage.textContent = `${pad(current)} / ${pad(totalStages)}`;
  }
  window.addEventListener('scroll', () => {
    if (!progressQueued) { progressQueued = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', () => layoutProgress());
  window.addEventListener('load', () => layoutProgress());

  /* ---------- SOUND (Web Audio API generated) ---------- */
  // Off by default — the visitor opts in, and the choice is remembered.
  const SFX_KEY = 'mornm.sfx';
  let audioCtx = null;
  let sfxOn = false;
  try { sfxOn = localStorage.getItem(SFX_KEY) === 'on'; } catch (_) {}
  let audioUnlocked = false;

  const ensureAudio = () => {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    audioUnlocked = true;
  };

  let master, comp;
  const setupMaster = () => {
    if (!audioCtx || master) return;
    comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 22; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.18;
    master = audioCtx.createGain();
    master.gain.value = 0.35;
    comp.connect(master);
    master.connect(audioCtx.destination);
  };

  const tone = ({ type = 'sine', freq = 440, freqEnd = null, dur = 0.15, gain = 0.2, attack = 0.005, release = 0.08, filter = null, detune = 0 }) => {
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

  const noiseBurst = ({ dur = 0.25, gain = 0.12, freqStart = 8000, freqEnd = 300 }) => {
    if (!sfxOn || !audioCtx) return;
    setupMaster();
    const t0 = audioCtx.currentTime;
    const size = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
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
    src.connect(f); f.connect(g); g.connect(comp);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  };

  const sfx = {
    hover() { tone({ type: 'sine', freq: 1100, freqEnd: 1400, dur: 0.06, gain: 0.05, attack: 0.002, release: 0.05, filter: { type: 'lowpass', frequency: 3000 } }); },
    click() {
      tone({ type: 'triangle', freq: 880, freqEnd: 440, dur: 0.08, gain: 0.13, attack: 0.001, release: 0.05 });
      tone({ type: 'square', freq: 1760, freqEnd: 660, dur: 0.05, gain: 0.04, attack: 0.001, release: 0.04, filter: { type: 'highpass', frequency: 1200 } });
    },
    tick() { tone({ type: 'square', freq: 1320, freqEnd: 990, dur: 0.03, gain: 0.04, attack: 0.001, release: 0.03, filter: { type: 'lowpass', frequency: 2600 } }); },
    flip() { noiseBurst({ dur: 0.22, gain: 0.08, freqStart: 6000, freqEnd: 900 }); },
    whoosh() { noiseBurst({ dur: 0.35, gain: 0.10, freqStart: 4000, freqEnd: 200 }); },
    boot() { tone({ type: 'sawtooth', freq: 220, freqEnd: 880, dur: 0.45, gain: 0.08, attack: 0.01, release: 0.2, filter: { type: 'lowpass', frequency: 2000 } }); },
  };

  const bindSfx = (root = document) => {
    root.querySelectorAll('[data-sfx]').forEach(el => {
      const type = el.getAttribute('data-sfx');
      if (type === 'hover' || type === 'click') el.addEventListener('mouseenter', () => sfx.hover());
      if (type === 'click') el.addEventListener('click', () => sfx.click());
    });
  };
  bindSfx();

  const unlock = (e) => {
    ensureAudio();
    setupMaster();
    sfx.boot();
    // music saved as ON resumes on the first gesture (unless that gesture is the music toggle itself)
    if (musicOn && !(e && e.target.closest && e.target.closest('#musicToggle'))) startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  const soundBtn = document.getElementById('soundToggle');
  const renderSoundBtn = () => {
    soundBtn.classList.toggle('is-off', !sfxOn);
    soundBtn.setAttribute('aria-pressed', String(sfxOn));
    soundBtn.querySelector('.nav__sound-text').textContent = sfxOn ? 'SFX · ON' : 'SFX · OFF';
  };
  renderSoundBtn();
  soundBtn.addEventListener('click', () => {
    sfxOn = !sfxOn;
    try { localStorage.setItem(SFX_KEY, sfxOn ? 'on' : 'off'); } catch (_) {}
    renderSoundBtn();
    if (sfxOn) { ensureAudio(); sfx.click(); }
  });

  /* ---------- MUSIC — generative ambient score (Web Audio, no audio files) ----------
     A low drone, slow pad chords and koto-like plucks on the Japanese
     hirajoshi scale (A B C E F), through a long reverb and a soft echo.
     It is composed live, so it never loops the same way and costs no
     download. Off by default; the choice is remembered and resumes on the
     visitor's first click (browsers block sound before a gesture). */
  const MUSIC_KEY = 'mornm.music';
  const musicBtn = document.getElementById('musicToggle');
  let musicOn = false;
  try { musicOn = localStorage.getItem(MUSIC_KEY) === 'on'; } catch (_) {}
  let music = null;
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const HIRAJOSHI = [0, 2, 3, 7, 8];                         // A B C E F
  const CHORDS = [[57, 60, 64, 69], [53, 57, 60, 64], [52, 57, 59, 64], [50, 53, 57, 62]]; // Am · Fmaj7 · Esus · Dm

  function impulse(ctx, seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function startMusic() {
    ensureAudio();
    if (!audioCtx || music) return;
    const ctx = audioCtx, t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.5, t0 + 3);               // slow fade-in
    out.connect(ctx.destination);

    const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 4.2, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(out);
    const dry = ctx.createGain(); dry.gain.value = 0.55; dry.connect(out);
    const bus = ctx.createGain(); bus.connect(dry); bus.connect(verb);

    // echo for the plucks
    const echo = ctx.createDelay(2); echo.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const echoTone = ctx.createBiquadFilter(); echoTone.type = 'lowpass'; echoTone.frequency.value = 2000;
    echo.connect(echoTone); echoTone.connect(fb); fb.connect(echo); echoTone.connect(bus);

    // drone: root, fifth, octave — filter breathes slowly
    const droneTone = ctx.createBiquadFilter(); droneTone.type = 'lowpass'; droneTone.frequency.value = 420; droneTone.Q.value = 0.8;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.045;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 200;
    lfo.connect(lfoAmt); lfoAmt.connect(droneTone.frequency);
    const droneGain = ctx.createGain(); droneGain.gain.value = 0.06;
    droneTone.connect(droneGain); droneGain.connect(bus);
    const oscs = [lfo];
    [45, 52, 57].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = i ? 'triangle' : 'sawtooth';
      o.frequency.value = midi(m);
      o.detune.value = (i - 1) * 7;
      o.connect(droneTone); o.start(); oscs.push(o);
    });
    lfo.start();

    const pad = (notes, t, dur) => {
      notes.forEach((m, k) => {
        const o = ctx.createOscillator(); o.type = k % 2 ? 'triangle' : 'sine';
        o.frequency.value = midi(m); o.detune.value = (Math.random() - 0.5) * 10;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.028, t + 2.6);
        g.gain.setValueAtTime(0.028, t + dur - 2.4);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1300;
        o.connect(f); f.connect(g); g.connect(bus);
        o.start(t); o.stop(t + dur + 0.8);
      });
    };
    const pluck = (m, t, vel) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = midi(m);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = midi(m) * 2.01;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(f);
      f.connect(bus); f.connect(echo);
      o.start(t); o2.start(t); o.stop(t + 2); o2.stop(t + 2);
    };

    // look-ahead scheduler (timers only plan, Web Audio keeps exact time)
    let nextChord = t0 + 0.5, nextNote = t0 + 2.2, chordIdx = 0, degree = 7, paused = false;
    const BEAT = 60 / 72;
    const plan = () => {
      if (paused) return;
      const horizon = ctx.currentTime + 0.6;
      while (nextChord < horizon) {
        pad(CHORDS[chordIdx % CHORDS.length], nextChord, BEAT * 12);
        chordIdx++; nextChord += BEAT * 12;
      }
      while (nextNote < horizon) {
        if (Math.random() > 0.22) {                                // breathing room: some rests
          degree = Math.max(0, Math.min(11, degree + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
          const m = 69 + Math.floor(degree / 5) * 12 + HIRAJOSHI[degree % 5] - 12;
          pluck(m, nextNote, 0.05 + Math.random() * 0.03);
        }
        nextNote += BEAT * [0.5, 1, 1, 1.5, 2][Math.floor(Math.random() * 5)];
      }
    };
    const timer = setInterval(plan, 200);
    plan();

    music = {
      fade(to, sec) { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(to, t + sec); },
      pause() { paused = true; this.fade(0, 0.8); },
      resume() {
        paused = false;
        nextChord = Math.max(nextChord, ctx.currentTime + 0.2);
        nextNote = Math.max(nextNote, ctx.currentTime + 0.4);
        this.fade(0.5, 1.6);
      },
      stop() {
        clearInterval(timer);
        this.fade(0, 1.4);
        setTimeout(() => { oscs.forEach(o => { try { o.stop(); } catch (_) {} }); out.disconnect(); }, 1600);
      },
    };
  }

  function stopMusic() { if (music) { music.stop(); music = null; } }

  const renderMusicBtn = () => {
    if (!musicBtn) return;
    musicBtn.classList.toggle('is-on', musicOn);
    musicBtn.setAttribute('aria-pressed', String(musicOn));
    musicBtn.querySelector('.nav__music-text').textContent = musicOn ? 'MUSIC · ON' : 'MUSIC · OFF';
  };
  renderMusicBtn();
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      musicOn = !musicOn;
      try { localStorage.setItem(MUSIC_KEY, musicOn ? 'on' : 'off'); } catch (_) {}
      renderMusicBtn();
      if (musicOn) startMusic(); else stopMusic();
    });
  }
  // quiet while the tab is hidden, back when it returns
  document.addEventListener('visibilitychange', () => {
    if (!music) return;
    if (document.hidden) music.pause(); else music.resume();
  });

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
  if (finePointer && !reducedMotion && cursor) {
    const dot = cursor.querySelector('.cursor__dot');
    const ring = cursor.querySelector('.cursor__ring');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let following = false;

    // The ring eases toward the pointer and the loop parks itself once it
    // has caught up, so nothing runs while the mouse is still.
    const followLoop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) requestAnimationFrame(followLoop);
      else following = false;
    };

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!cursor.classList.contains('is-live')) { rx = mx; ry = my; cursor.classList.add('is-live'); }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (!following) { following = true; requestAnimationFrame(followLoop); }
    }, { passive: true });

    // Delegated, so tiles and frames created later are covered too
    const HOVER_SEL = 'a, button, summary, .chip, .skill, .ep-card, .idcard, .reel__frame, .marks__canvas';
    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest(HOVER_SEL));
    });
  }

  /* ---------- MOBILE NAV ---------- */
  const burger = document.getElementById('burger');
  const navEl = document.getElementById('nav');
  const setNavOpen = (open) => {
    navEl.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => {
    setNavOpen(!navEl.classList.contains('is-open'));
    sfx.click();
  });
  navEl.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => setNavOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navEl.classList.contains('is-open')) { setNavOpen(false); burger.focus(); }
  });

  /* ---------- SCROLL PARALLAX for kanji column ---------- */
  const kanjiCol = document.querySelector('.kanji-column');
  if (kanjiCol && !reducedMotion) {
    let kanjiQueued = false;
    window.addEventListener('scroll', () => {
      if (kanjiQueued) return;
      kanjiQueued = true;
      requestAnimationFrame(() => {
        kanjiQueued = false;
        kanjiCol.style.transform = `translateY(calc(-50% + ${-window.scrollY * 0.15}px))`;
      });
    }, { passive: true });
  }

  /* ---------- HUD CLOCK ---------- */
  const clock = document.getElementById('hudClock');
  if (clock) {
    const updateClock = () => {
      const d = new Date();
      clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} BGT`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* ---------- SMOOTH ANCHOR SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- MEMBER CARD — tilt, holo sheen, flip ---------- */
  const idcard = document.getElementById('idcard');
  if (idcard) {
    const MAX_TILT = 13; // degrees
    // touch screens can't hover — tell them to tap instead
    const hint = document.querySelector('.idcard__hint');
    if (hint && !finePointer) {
      hint.setAttribute('data-i18n-en', 'Tap the card to flip it');
      hint.setAttribute('data-i18n-ar', 'اضغط على الكارت لتقلبه');
    }
    if (finePointer && !reducedMotion) {
      let tiltQueued = false, ev = null;
      idcard.addEventListener('pointermove', (e) => {
        ev = e;
        if (tiltQueued) return;
        tiltQueued = true;
        requestAnimationFrame(() => {
          tiltQueued = false;
          const r = idcard.getBoundingClientRect();
          const x = (ev.clientX - r.left) / r.width;
          const y = (ev.clientY - r.top) / r.height;
          idcard.classList.add('is-tilting');
          idcard.style.setProperty('--ry', ((x - 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
          idcard.style.setProperty('--rx', ((0.5 - y) * 2 * MAX_TILT).toFixed(2) + 'deg');
          idcard.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          idcard.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
      });
      idcard.addEventListener('pointerleave', () => {
        idcard.classList.remove('is-tilting');
        idcard.style.setProperty('--rx', '0deg');
        idcard.style.setProperty('--ry', '0deg');
      });
    }
    const flip = () => {
      const flipped = idcard.classList.toggle('is-flipped');
      idcard.setAttribute('aria-pressed', String(flipped));
      sfx.flip();
    };
    idcard.addEventListener('click', flip);
    idcard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
  }

  /* ---------- LIGHTBOX (shared by the reel and the archive) ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCap = document.getElementById('lightboxCap');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let lbItems = [];          // [{ src, alt, cap }]
  let lbIndex = 0;
  let lbOnChange = null;     // lets the reel follow the lightbox
  let lbReturnFocus = null;

  const showLightbox = (idx) => {
    if (!lbItems.length) return;
    lbIndex = (idx + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
    lightboxCap.textContent = item.cap || '';
    const count = document.createElement('span');
    count.className = 'lightbox__count';
    count.textContent = `${pad(lbIndex + 1)} / ${pad(lbItems.length)}`;
    lightboxCap.appendChild(count);
    if (lbOnChange) lbOnChange(lbIndex);
  };
  const openLightbox = (items, idx, onChange) => {
    if (!lightbox || !items.length) return;
    lbItems = items;
    lbOnChange = onChange || null;
    showLightbox(idx);
    if (!lightbox.classList.contains('is-open')) {
      lbReturnFocus = document.activeElement;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();
    }
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lbReturnFocus && typeof lbReturnFocus.focus === 'function') lbReturnFocus.focus({ preventScroll: true });
    lbReturnFocus = null;
  };
  if (lightbox) {
    lightboxClose.addEventListener('click', () => { sfx.click(); closeLightbox(); });
    lightboxPrev.addEventListener('click', () => { sfx.click(); showLightbox(lbIndex - 1); });
    lightboxNext.addEventListener('click', () => { sfx.click(); showLightbox(lbIndex + 1); });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeLightbox(); return; }
      // In Arabic the reading direction flips, so ← means "next"
      const step = isRtl() ? -1 : 1;
      if (e.key === 'ArrowLeft')  showLightbox(lbIndex - step);
      if (e.key === 'ArrowRight') showLightbox(lbIndex + step);
      if (e.key === 'Tab') {
        const focusables = [lightboxClose, lightboxPrev, lightboxNext];
        const i = focusables.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1)
                                : (i === -1 || i === focusables.length - 1 ? 0 : i + 1);
        e.preventDefault();
        focusables[next].focus();
      }
    });
  }

  /* ---------- WORKS — shared episode data (index reel + posters gallery) ---------- */
  const WORKS = Array.isArray(window.MORNM_WORKS) ? window.MORNM_WORKS : [];
  const CAT_LABEL = {
    post:   { en: 'Post',    ar: 'بوست',   jp: '投稿' },
    surreal: { en: 'Surreal', ar: 'سريالي', jp: '超現実' },
    rollup: { en: 'Roll-up', ar: 'رول أب', jp: 'ロールアップ' },
  };
  // 1 → 一, 14 → 十四, 32 → 三十二  (episode titles: 第十四話)
  const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const toKanji = (n) => {
    const tens = Math.floor(n / 10), ones = n % 10;
    return (tens > 1 ? KANJI[tens] : '') + (tens ? '十' : '') + KANJI[ones];
  };
  const epTitle = (n) => `第${toKanji(n)}話`;
  const works = WORKS.map((w, i) => ({
    ...w,
    no: i + 1,
    full: w.src || `assets/works/${w.slug}.webp`,
    thumb: w.src || `assets/works/${w.slug}-t.webp`,
  }));
  const workCounts = works.reduce((acc, w) => { acc[w.cat] = (acc[w.cat] || 0) + 1; return acc; }, { all: works.length });
  const lang2 = () => (isAr() ? 'ar' : 'en');
  const lightboxItemsFor = (items) => items.map(w => ({
    src: w.full,
    alt: `${w.client} — ${w.title[lang2()]}`,
    cap: `EP.${pad(w.no)} ${epTitle(w.no)} · ${w.client.toUpperCase()}`,
  }));
  // one "episode card": thumbnail + EP badge + title (used by the reel strip and the gallery)
  const episodeCard = (w, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    const fig = document.createElement('span');
    fig.className = cls + '-thumb';
    const t = document.createElement('img');
    t.src = w.thumb;
    t.alt = '';
    t.loading = 'lazy';
    t.decoding = 'async';
    t.draggable = false;
    const badge = document.createElement('span');
    badge.className = cls + '-no';
    badge.textContent = `EP.${pad(w.no)}`;
    const play = document.createElement('span');
    play.className = cls + '-play';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶';
    fig.append(t, badge, play);
    const cap = document.createElement('span');
    cap.className = cls + '-cap';
    const jp = document.createElement('em');
    jp.textContent = epTitle(w.no);
    const title = document.createElement('span');
    title.className = cls + '-title';
    title.textContent = w.title[lang2()];
    cap.append(jp, title);
    b.append(fig, cap);
    bindImage(t);
    return b;
  };
  const refreshCardTitles = (root, cls, items) => {
    root.querySelectorAll('.' + cls + '-title').forEach((el, i) => { if (items[i]) el.textContent = items[i].title[lang2()]; });
  };

  /* ---------- WORK — anime "episode" reel (index.html) ---------- */
  const reel = document.getElementById('reel');
  if (reel && works.length) {
    const screen = document.getElementById('reelScreen');
    const img = document.getElementById('reelImg');
    const backdrop = document.getElementById('reelBackdrop');
    const epBig = document.getElementById('reelEpBig');
    const wipeText = document.getElementById('reelWipeText');
    const elEpNo = document.getElementById('reelEpNo');
    const elEpJp = document.getElementById('reelEpJp');
    const nextBtn = document.getElementById('reelNextEp');
    const nextImg = document.getElementById('reelNextImg');
    const nextNo = document.getElementById('reelNextNo');
    const nextTitle = document.getElementById('reelNextTitle');
    const elCat = document.getElementById('reelCat');
    const elClient = document.getElementById('reelClient');
    const elTitle = document.getElementById('reelTitle');
    const elDesc = document.getElementById('reelDesc');
    const elCount = document.getElementById('reelCount');
    const track = document.getElementById('reelTrack');
    const filters = reel.querySelector('.reel__filters');

    const startFilter = filters.querySelector('.reel__chip.is-active')?.dataset.filter || 'post';
    let list = works.filter(w => w.cat === startFilter);
    let pos = 0;

    reel.querySelectorAll('[data-count]').forEach(el => { el.textContent = pad(workCounts[el.dataset.count] || 0); });

    const buildStrip = () => {
      track.innerHTML = '';
      list.forEach((w, i) => {
        const li = document.createElement('li');
        const card = episodeCard(w, 'reel__frame');
        card.setAttribute('role', 'option');
        card.dataset.i = i;
        li.appendChild(card);
        track.appendChild(li);
      });
    };

    // Scroll only the strip sideways — scrollIntoView would also scroll the page down
    const centreFrame = (f, smooth) => {
      const fr = f.getBoundingClientRect();
      const tr = track.getBoundingClientRect();
      const delta = (fr.left + fr.width / 2) - (tr.left + tr.width / 2);
      track.scrollBy({ left: delta, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
    };

    const renderInfo = () => {
      const w = list[pos];
      const lang = lang2();
      const cat = CAT_LABEL[w.cat];
      elEpNo.textContent = pad(w.no);
      elEpJp.textContent = epTitle(w.no);
      elCat.innerHTML = '';
      const jp = document.createElement('i');
      jp.textContent = cat.jp;
      elCat.append(jp, document.createTextNode(' ' + cat[lang]));
      elClient.textContent = w.client;
      elTitle.textContent = w.title[lang];
      elDesc.textContent = w.desc[lang];
      elCount.textContent = `${pad(pos + 1)} / ${pad(list.length)}`;
      img.alt = `${w.client} — ${w.title[lang]}`;
      screen.setAttribute('aria-label', (lang === 'ar' ? 'عرض بالحجم الكامل: ' : 'View full size: ') + w.title[lang]);

      // 次回予告 — next-episode preview
      const n = list[(pos + 1) % list.length];
      nextImg.src = n.thumb;
      nextNo.textContent = `EP.${pad(n.no)} · ${epTitle(n.no)}`;
      nextTitle.textContent = n.title[lang];
      nextBtn.setAttribute('aria-label', (lang === 'ar' ? 'الحلقة القادمة: ' : 'Next episode: ') + n.title[lang]);
    };

    // puts the new episode on screen: poster, backdrop, big episode number
    const showEpisode = (w) => {
      img.src = w.full;
      backdrop.style.backgroundImage = `url("${w.full}")`;
      epBig.textContent = pad(w.no);
      screen.style.setProperty('--tilt', (((w.no * 37) % 5) - 2) * 0.618 + 'deg');
      screen.classList.remove('is-popping');
      void screen.offsetWidth;
      screen.classList.add('is-popping');
    };

    let wipeTimer = null;
    const select = (i, { scroll = true, silent = false } = {}) => {
      pos = (i + list.length) % list.length;
      const w = list[pos];
      const preload = new Image();
      preload.src = w.full;
      clearTimeout(wipeTimer);
      if (silent || reducedMotion) {
        // quiet swap (first paint, filters, lightbox sync)
        img.classList.add('is-swapping');
        preload.onload = preload.onerror = () => {
          showEpisode(w);
          requestAnimationFrame(() => img.classList.remove('is-swapping'));
        };
      } else {
        // eyecatch wipe: panels slash across, the episode title flashes, the new poster lands mid-wipe
        wipeText.textContent = epTitle(w.no);
        screen.classList.remove('is-wiping');
        void screen.offsetWidth;
        screen.classList.add('is-wiping');
        wipeTimer = setTimeout(() => showEpisode(w), 300);
      }
      renderInfo();
      track.querySelectorAll('.reel__frame').forEach((f, k) => {
        const on = k === pos;
        f.classList.toggle('is-active', on);
        f.setAttribute('aria-selected', String(on));
        f.tabIndex = on ? 0 : -1;
        if (on && scroll) centreFrame(f, true);
      });
      if (!silent) sfx.tick();
      // warm the neighbours so arrows feel instant
      [pos + 1, pos - 1].forEach(k => { const n = list[(k + list.length) % list.length]; if (n) (new Image()).src = n.full; });
    };

    const zoom = () => { sfx.click(); openLightbox(lightboxItemsFor(list), pos, (k) => select(k, { silent: true })); };

    // controls
    document.getElementById('reelPrev').addEventListener('click', () => select(pos - 1));
    document.getElementById('reelNext').addEventListener('click', () => select(pos + 1));
    nextBtn.addEventListener('click', () => select(pos + 1));
    screen.addEventListener('animationend', (e) => {
      if (e.animationName === 'eyecatchText') screen.classList.remove('is-wiping');
    });
    document.getElementById('reelZoom').addEventListener('click', zoom);
    screen.addEventListener('click', zoom);

    track.addEventListener('click', (e) => {
      const f = e.target.closest('.reel__frame');
      if (f) select(Number(f.dataset.i));
    });
    // arrow keys on the strip (mirrored in Arabic); focus without jumping the page
    const focusActive = () => track.querySelector('.is-active')?.focus({ preventScroll: true });
    track.addEventListener('keydown', (e) => {
      const step = isRtl() ? -1 : 1;
      let handled = true;
      if (e.key === 'ArrowRight') select(pos + step);
      else if (e.key === 'ArrowLeft') select(pos - step);
      else if (e.key === 'Home') select(0);
      else if (e.key === 'End') select(list.length - 1);
      else handled = false;
      if (handled) { e.preventDefault(); focusActive(); }
    });

    // drag-to-scroll the episode strip (delta based, so it works in RTL too)
    let dragStartX = 0, dragStartScroll = 0, dragging = false, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return; // touch scrolls natively
      dragging = true; moved = false;
      dragStartX = e.clientX;
      dragStartScroll = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = dragStartScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      requestAnimationFrame(() => track.classList.remove('is-dragging'));
    });
    // vertical wheel scrolls the strip sideways
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const before = track.scrollLeft;
      track.scrollLeft += isRtl() ? -e.deltaY : e.deltaY;
      if (track.scrollLeft !== before) e.preventDefault();
    }, { passive: false });

    // filters: posts / roll-ups
    filters.addEventListener('click', (e) => {
      const chip = e.target.closest('.reel__chip');
      if (!chip) return;
      filters.querySelectorAll('.reel__chip').forEach(c => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      list = works.filter(w => w.cat === chip.dataset.filter);
      buildStrip();
      track.scrollLeft = 0;
      select(0, { scroll: false, silent: true });
    });

    document.addEventListener('mornm:lang', () => {
      renderInfo();
      refreshCardTitles(track, 'reel__frame', list);
    });

    buildStrip();
    select(0, { scroll: false, silent: true });
  }

  /* ---------- IDENTITIES — logo marquee + showcase stage ---------- */
  const LOGOS = Array.isArray(window.MORNM_LOGOS) ? window.MORNM_LOGOS : [];
  const logoSrc = (l) => `assets/logos/${l.slug}.png`;
  let selectMark = () => {};

  /* Marquee: every set holds the logos four times (≈4000px on desktop,
     ≈2800px on phones) — always wider than the 1220px strip, with no
     measuring at all, so there can never be an empty tail. The track
     slides by exactly one set (-50%) and loops seamlessly. */
  const logoTrack = document.getElementById('logoTrack');
  if (logoTrack && LOGOS.length) {
    const REPEATS = 4;
    [false, true].forEach(hidden => {
      const set = document.createElement('div');
      set.className = 'logos__set';
      if (hidden) set.setAttribute('aria-hidden', 'true');
      for (let r = 0; r < REPEATS; r++) {
        LOGOS.forEach((l, i) => {
          const item = document.createElement('button');
          item.type = 'button';
          item.className = 'logos__item';
          item.dataset.i = i;
          if (hidden || r) item.tabIndex = -1;            // one focusable copy of each logo
          const im = document.createElement('img');
          im.src = logoSrc(l);
          im.decoding = 'async';
          im.draggable = false;
          im.alt = hidden || r ? '' : l.name[lang2()];
          item.appendChild(im);
          set.appendChild(item);
        });
      }
      logoTrack.appendChild(set);
    });
    logoTrack.addEventListener('click', (e) => {
      const item = e.target.closest('.logos__item');
      if (item) selectMark(Number(item.dataset.i), true);
    });
    const relabel = () => logoTrack.querySelectorAll('.logos__item').forEach(item => {
      const l = LOGOS[item.dataset.i];
      item.title = l.name[lang2()];
      const im = item.querySelector('img');
      if (im.alt) im.alt = l.name[lang2()];
    });
    relabel();
    document.addEventListener('mornm:lang', relabel);
  }

  /* Showcase: big stage with golden construction grid, black/white toggle */
  const marks = document.getElementById('marks');
  if (marks && LOGOS.length) {
    const canvas = document.getElementById('marksCanvas');
    const img = document.getElementById('marksImg');
    const elNo = document.getElementById('marksNo');
    const elIndex = document.getElementById('marksIndex');
    const elMode = document.getElementById('marksMode');
    const elName = document.getElementById('marksName');
    const elType = document.getElementById('marksType');
    const elAbout = document.getElementById('marksAbout');
    const elIdea = document.getElementById('marksIdea');
    const ring = canvas.querySelector('.marks__ring');
    const list = document.getElementById('marksList');
    let current = 0;
    let bg = 'dark';

    LOGOS.forEach((l, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'marks__thumb';
      b.dataset.i = i;
      const im = document.createElement('img');
      im.src = logoSrc(l);
      im.alt = '';
      im.decoding = 'async';
      const no = document.createElement('span');
      no.textContent = pad(i + 1);
      b.append(im, no);
      li.appendChild(b);
      list.appendChild(li);
    });

    const render = () => {
      const l = LOGOS[current];
      const lang = lang2();
      elNo.textContent = `MARK ${pad(current + 1)} / ${pad(LOGOS.length)}`;
      elIndex.textContent = pad(current + 1);
      elName.textContent = l.name[lang];
      elType.textContent = l.type ? l.type[lang] : '';
      elAbout.textContent = l.about ? l.about[lang] : '';
      elIdea.textContent = l.idea ? l.idea[lang] : '';
      img.alt = l.name[lang];
      elMode.textContent = bg === 'dark' ? 'MONO · WHITE' : 'MONO · BLACK';
      list.querySelectorAll('.marks__thumb').forEach((t, k) => {
        const on = k === current;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
        t.setAttribute('aria-label', LOGOS[k].name[lang]);
      });
    };

    /* Every mark is scaled so its bounding box is inscribed in the big
       construction circle (diagonal = 92% of the circle's diameter):
       wide wordmarks, tall calligraphy and square symbols all sit inside
       the same ring at the same optical weight. */
    const fitMark = () => {
      if (!img.naturalWidth) return;
      const r = ring.getBoundingClientRect();
      const d = Math.min(r.width, r.height) * 0.92;
      const a = img.naturalWidth / img.naturalHeight;
      const k = d / Math.sqrt(1 + a * a);
      img.style.width = (k * a).toFixed(1) + 'px';
      img.style.height = k.toFixed(1) + 'px';
    };
    img.addEventListener('load', fitMark);
    window.addEventListener('resize', fitMark);

    selectMark = (i, fromStrip = false) => {
      current = (i + LOGOS.length) % LOGOS.length;
      img.src = logoSrc(LOGOS[current]);
      // replay the reveal: grid redraws, the mark rises in
      canvas.classList.remove('is-changing');
      void canvas.offsetWidth;
      canvas.classList.add('is-changing');
      render();
      if (!fromStrip) sfx.tick();
      if (fromStrip) {
        sfx.click();
        const r = marks.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) marks.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
    };

    list.addEventListener('click', (e) => {
      const t = e.target.closest('.marks__thumb');
      if (t) selectMark(Number(t.dataset.i));
    });
    list.addEventListener('keydown', (e) => {
      const step = isRtl() ? -1 : 1;
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = current + (e.key === 'ArrowDown' ? 1 : step);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = current - (e.key === 'ArrowUp' ? 1 : step);
      if (next === null) return;
      e.preventDefault();
      selectMark(next);
      list.querySelectorAll('.marks__thumb')[current].focus({ preventScroll: true });
    });
    marks.querySelectorAll('.marks__tool').forEach(btn => btn.addEventListener('click', () => {
      bg = btn.dataset.bg;
      canvas.classList.toggle('is-light', bg === 'light');
      list.classList.toggle('is-light', bg === 'light');
      marks.querySelectorAll('.marks__tool').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      render();
    }));
    document.addEventListener('mornm:lang', render);
    img.src = logoSrc(LOGOS[0]);
    render();
  }

  /* ---------- EPISODE GALLERY (posters.html) — all selected works, anime style ---------- */
  const episodeGrid = document.getElementById('episodeGrid');
  if (episodeGrid && works.length) {
    const tabs = document.getElementById('episodeTabs');
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = pad(workCounts[el.dataset.count] || 0); });
    let shown = works.filter(w => w.cat === (tabs.querySelector('.is-active')?.dataset.filter || 'post'));

    const render = () => {
      episodeGrid.innerHTML = '';
      shown.forEach((w, i) => {
        const li = document.createElement('li');
        const card = episodeCard(w, 'ep-card');
        if (w.cat === 'rollup') card.classList.add('ep-card--tall');
        card.dataset.i = i;
        card.style.setProperty('--idx', i);
        card.setAttribute('aria-label', `EP.${pad(w.no)} — ${w.title[lang2()]}`);
        li.appendChild(card);
        episodeGrid.appendChild(li);
      });
    };
    episodeGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.ep-card');
      if (!card) return;
      sfx.click();
      openLightbox(lightboxItemsFor(shown), Number(card.dataset.i));
    });
    tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.ep-tab');
      if (!tab) return;
      tabs.querySelectorAll('.ep-tab').forEach(t => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-pressed', String(on));
      });
      shown = works.filter(w => w.cat === tab.dataset.filter);
      render();
    });
    document.addEventListener('mornm:lang', () => refreshCardTitles(episodeGrid, 'ep-card', shown));
    render();
  }

  /* ---------- PATH CHART ---------- */
  const pathCategories = {
    en: ['Design', 'Video', 'Adobe', 'Code', '3D'],
    ar: ['تصميم', 'فيديو', 'أدوبي', 'برمجة', 'ثلاثي الأبعاد']
  };
  const pathX = [100, 210, 320, 430, 540];

  const pathData = [
    {
      yearLabel: '2019 — 2022',
      title_en: 'Phone era — first sparks',
      title_ar: 'فترة الجوال — أول الشرارات',
      text_en: 'Got curious about design. Opened a design app on my phone and started messing around. Did some casual video cuts on the same screen. Nothing serious yet — just learning by breaking things.',
      text_ar: 'بدأ فضولي بالتصميم. فتحت تطبيق تصميم على الجوال وبدأت أجرّب، وعملت مونتاجًا بسيطًا للفيديو على نفس الشاشة. لم يكن شيئًا جديًا بعد — كنت أتعلم من أخطائي.',
      bullets_en: ['Mobile design apps', 'Casual phone edits', 'Re-watched anime intros a lot'],
      bullets_ar: ['تطبيقات تصميم على الجوال', 'مونتاج خفيف على الجوال', 'إعادة شارات الأنمي مرات كثيرة'],
      levels: [15, 10, 0, 0, 0]
    },
    {
      yearLabel: '2022 — 2024',
      title_en: 'Getting fluent on the small screen',
      title_ar: 'الإتقان على الشاشة الصغيرة',
      text_en: 'The phone became my whole studio. I could pull off most kinds of design on it, and my video edits started looking clean. Began peeking at the desktop tools at the end.',
      text_ar: 'صار الجوال استوديو كاملًا. أصبحت أنفّذ عليه معظم أنواع التصميم، وصار مونتاجي للفيديو أنظف. وفي آخر الفترة بدأت أتعرّف على برامج الكمبيوتر.',
      bullets_en: ['Phone design — most categories', 'Confident video editing', 'First peeks at desktop tools'],
      bullets_ar: ['تصميم على الجوال — أغلب الأنواع', 'مونتاج فيديو بثقة', 'أول تعرّف على برامج الكمبيوتر'],
      levels: [55, 50, 10, 0, 0]
    },
    {
      yearLabel: '2024 — 2026',
      title_en: 'PC, Adobe, and brand campaigns',
      title_ar: 'الكمبيوتر، أدوبي، وحملات العلامات',
      text_en: 'Moved to a real PC. Started taking Adobe seriously — Photoshop, Illustrator, After Effects, Premiere — and began designing campaigns for brands like Mytime and Clving. Learning to code on the side: HTML, CSS, JS, a bit of C++.',
      text_ar: 'انتقلت إلى كمبيوتر حقيقي، وأخذت أدوبي بجدية — فوتوشوب، إليستريتور، أفتر إفكتس، بريمير — وبدأت أصمم حملات لعلامات مثل Mytime و Clving. وأتعلم البرمجة على الجانب: HTML وCSS وJS وقليلًا من C++.',
      bullets_en: ['Adobe suite — daily driver', 'Campaigns for Mytime & Clving', 'Web code basics + a little C++'],
      bullets_ar: ['حزمة أدوبي — استخدام يومي', 'حملات لـ Mytime و Clving', 'أساسيات الويب وقليل من C++'],
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
  let currentPathIdx = 0;

  function renderPath(idx, skipLineAnim) {
    if (!lineEl) return;
    currentPathIdx = idx;
    const d = pathData[idx];
    const ar = isAr();

    const pointsStr = d.levels.map((lv, i) => `${pathX[i]},${pathY(lv)}`).join(' ');
    const areaStr = `${pathX[0]},320 ${pointsStr} ${pathX[pathX.length - 1]},320`;
    lineEl.setAttribute('points', pointsStr);
    glowEl.setAttribute('points', pointsStr);
    areaEl.setAttribute('points', areaStr);

    // re-trigger draw-on (stroke-dashoffset) animation
    if (!skipLineAnim) {
      const len = lineEl.getTotalLength();
      lineEl.style.transition = 'none';
      lineEl.style.strokeDasharray = len;
      lineEl.style.strokeDashoffset = len;
      void lineEl.getBoundingClientRect();
      lineEl.style.transition = 'stroke-dashoffset 1.618s cubic-bezier(.2,.7,.2,1)';
      lineEl.style.strokeDashoffset = 0;
    }

    ptEls.forEach((c, i) => { c.setAttribute('cx', pathX[i]); c.setAttribute('cy', pathY(d.levels[i])); });
    valEls.forEach((t, i) => {
      t.setAttribute('x', pathX[i]);
      t.setAttribute('y', pathY(d.levels[i]) - 14);
      t.textContent = d.levels[i];
    });

    const cats = ar ? pathCategories.ar : pathCategories.en;
    xLabels.forEach((t, i) => { t.textContent = cats[i]; });

    if (pathYearEl)  pathYearEl.textContent  = d.yearLabel;
    if (pathTitleEl) pathTitleEl.textContent = ar ? d.title_ar : d.title_en;
    if (pathTextEl)  pathTextEl.textContent  = ar ? d.text_ar  : d.text_en;
    if (pathBulletsEl) {
      pathBulletsEl.innerHTML = '';
      (ar ? d.bullets_ar : d.bullets_en).forEach(b => {
        const li = document.createElement('li');
        li.textContent = b;
        pathBulletsEl.appendChild(li);
      });
    }

    // tab active state (roving tabindex for keyboard users)
    pathTabs.forEach((tab, i) => {
      const on = i === idx;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.setAttribute('tabindex', on ? '0' : '-1');
    });

    const desc = document.querySelector('.path__desc');
    if (desc) {
      desc.classList.remove('is-changing');
      void desc.offsetWidth;
      desc.classList.add('is-changing');
    }
  }

  pathTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => renderPath(i));
    // ← / → move between tabs (mirrored in Arabic), Home / End jump
    tab.addEventListener('keydown', (e) => {
      const last = pathTabs.length - 1;
      const fwd = isRtl() ? 'ArrowLeft' : 'ArrowRight';
      const back = isRtl() ? 'ArrowRight' : 'ArrowLeft';
      let next = null;
      if (e.key === fwd)  next = i === last ? 0 : i + 1;
      if (e.key === back) next = i === 0 ? last : i - 1;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End')  next = last;
      if (next === null) return;
      e.preventDefault();
      renderPath(next);
      pathTabs[next].focus();
    });
  });
  document.addEventListener('mornm:lang', () => renderPath(currentPathIdx, true));

  /* ---------- START ---------- */
  applyLang(currentLang);
  renderPath(currentPathIdx, true);
  // animate the first line draw when the chart scrolls into view
  const pathSec = document.getElementById('timeline');
  if (pathSec && lineEl) {
    const drawObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { renderPath(currentPathIdx, false); drawObs.unobserve(e.target); }
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
