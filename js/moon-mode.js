(() => {
  'use strict';
  if (window.__tsukikageMoonMode) return;
  window.__tsukikageMoonMode = true;
  const root = document.documentElement;
  const key = 'tsukikage.moon.v1';
  let active = false, previousTheme = 'light', previousMeta = null;
  let press = null, quoteTimer = null, suppressUntil = 0;
  let wake = null;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let whisperIndex = 0;
  const whispers = ['这是一场无休止的梦', '梦境很美好', '不想醒来'];

  function save() {
    try {
      if (active) window.sessionStorage.setItem(key, JSON.stringify({ version: 1, theme: previousTheme }));
      else window.sessionStorage.removeItem(key);
    } catch (_) { /* The current page remains usable with storage disabled. */ }
  }

  function colorMeta(value) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && value !== null) meta.content = value;
  }

  function syncControls() {
    document.querySelectorAll('[data-moon-mode-trigger]').forEach(button => button.setAttribute('aria-pressed', String(active)));
    document.querySelectorAll('[data-moon-exit]').forEach(button => { button.hidden = !active; });
    const label = document.querySelector('.menu-darkmode-text');
    if (label) label.textContent = root.getAttribute('data-theme') === 'dark' ? '浅色模式' : '深色模式';
  }

  function setTheme(theme) {
    const fn = theme === 'dark' ? window.activateDarkMode : window.activateLightMode;
    if (typeof fn === 'function') fn();
    else root.setAttribute('data-theme', theme);
    // Keep registered comment/diagram integrations in step with the theme.
    const hooks = window.globalFn && window.globalFn.themeChange;
    if (hooks) Object.values(hooks).forEach(callback => {
      try { if (typeof callback === 'function') callback(theme); } catch (_) { /* Optional integration. */ }
    });
  }

  function hideQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = null;
    const quote = document.querySelector('[data-moon-quote]');
    if (quote) quote.hidden = true;
  }

  function showQuote(text) {
    hideQuote();
    const quote = document.querySelector('[data-moon-quote]');
    if (!quote) return;
    const label = quote.querySelector('[data-moon-quote-text]');
    if (label) label.textContent = text;
    quote.hidden = false;
    // Restart one short CSS animation on demand, without a continuous render loop.
    quote.style.animation = 'none';
    void quote.offsetWidth;
    quote.style.animation = '';
    quoteTimer = window.setTimeout(hideQuote, 4600);
  }

  function enter(restoredTheme) {
    clearWake();
    previousTheme = restoredTheme || (root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    previousMeta = restoredTheme ? null : document.querySelector('meta[name="theme-color"]')?.content ?? null;
    active = true;
    root.setAttribute('data-moon-mode', 'on');
    setTheme('dark');
    colorMeta('#11152d');
    syncControls();
    save();
    document.dispatchEvent(new CustomEvent('blog:moon-mode-change', { detail: { active: true, entering: !restoredTheme } }));
    if (!restoredTheme) {
      whisperIndex = 0;
      showQuote(whispers[0]);
      document.dispatchEvent(new CustomEvent('blog:moon-mode-start'));
    }
  }

  function finishExit(restore = true) {
    active = false;
    root.removeAttribute('data-moon-mode');
    hideQuote();
    if (restore) { setTheme(previousTheme); colorMeta(previousMeta); }
    syncControls();
    save();
    document.dispatchEvent(new CustomEvent('blog:moon-mode-change', { detail: { active: false } }));
  }

  function clearWake() {
    if (wake) {
      const old = wake;
      wake = null;
      window.clearTimeout(old.switchTimer);
      window.clearTimeout(old.endTimer);
      old.transition?.skipTransition();
      old.veil.remove();
      old.backdrop?.remove();
      old.heroTint?.remove();
    }
    root.removeAttribute('data-moon-leaving');
    root.removeAttribute('data-moon-wake-view');
    root.removeAttribute('data-moon-wake-fallback');
  }

  function finishWake() {
    if (wake && active) finishExit();
    clearWake();
  }

  function exit(restore = true) {
    // Theme controls must remain synchronous so their existing handlers win.
    if (!restore || reduce?.matches || document.hidden || !document.body) {
      clearWake(); finishExit(restore); return;
    }
    if (wake || !active) return;
    hideQuote();
    const veil = document.createElement('span');
    veil.className = 'moon-wake-veil';
    veil.setAttribute('aria-hidden', 'true');
    veil.dataset.returnTheme = previousTheme;
    document.body.append(veil);
    const native = typeof document.startViewTransition === 'function';
    // Preserve only decorative backgrounds; live content keeps its own DOM and focus.
    let backdrop = null, heroTint = null;
    const background = document.getElementById('web_bg');
    if (!native && background) {
      backdrop = document.createElement('span');
      backdrop.className = 'moon-wake-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.style.background = window.getComputedStyle(background).background;
      document.body.append(backdrop);
    }
    const hero = document.querySelector('#page-header.full_page');
    if (!native && hero) {
      heroTint = document.createElement('span');
      heroTint.className = 'moon-wake-hero-tint';
      heroTint.setAttribute('aria-hidden', 'true');
      hero.append(heroTint);
    }
    root.setAttribute('data-moon-leaving', '');
    if (!native) root.setAttribute('data-moon-wake-fallback', '');
    // Clear the saved dream as soon as waking is requested, even before the fade ends.
    try { window.sessionStorage.removeItem(key); } catch (_) { /* Storage is optional. */ }
    const current = wake = { veil, backdrop, heroTint, transition: null, switchTimer: null, endTimer: null };
    document.dispatchEvent(new CustomEvent('blog:moon-wake-start'));
    // First return the arrival wave; then composite the two page states once.
    current.switchTimer = window.setTimeout(() => {
      if (wake !== current || !active) return;
      if (!native) { finishExit(); return; }
      root.setAttribute('data-moon-wake-view', '');
      try {
        current.transition = document.startViewTransition(() => {
          if (wake === current && active) finishExit();
        });
        current.transition.ready.catch(() => { /* Capture may be skipped; update still runs. */ });
        current.transition.finished.then(() => {
          if (wake === current) finishWake();
        }, () => { if (wake === current) finishWake(); });
      } catch (_) {
        root.removeAttribute('data-moon-wake-view');
        finishExit();
      }
    }, 450);
    // A bounded fallback also covers interrupted native captures.
    current.endTimer = window.setTimeout(() => { if (wake === current) finishWake(); }, native ? 1400 : 1000);
  }

  function toggle() {
    if (wake && active) return;
    if (active) exit(); else enter();
  }
  function trigger(event) { return event.target instanceof Element && event.target.closest('[data-moon-mode-trigger]'); }
  function cancelPress() {
    if (press) window.clearTimeout(press.timer);
    press = null;
  }

  // Delegation survives title replacement during PJAX navigation.
  document.addEventListener('dblclick', event => {
    if (!trigger(event) || Date.now() < suppressUntil) return;
    event.preventDefault(); cancelPress(); toggle();
  });
  document.addEventListener('click', event => {
    if (active && event.target instanceof Element && event.target.closest('[data-moon-exit]')) {
      event.preventDefault(); cancelPress(); exit();
      const focus = document.querySelector('[data-moon-mode-trigger]') || document.getElementById('go-up');
      if (focus) focus.focus({ preventScroll: true });
      return;
    }
    if (active && !wake && event.target instanceof Element && event.target.closest('[data-moon-whisper]')) {
      whisperIndex = (whisperIndex + 1) % whispers.length;
      showQuote(whispers[whisperIndex]);
    }
    if (active && event.target instanceof Element && event.target.closest('#darkmode, #menu-darkmode, .darkmode_switchbutton')) exit(false);
    // Native keyboard/assistive activation has detail=0; a single pointer click does nothing.
    if (trigger(event) && event.detail === 0 && Date.now() >= suppressUntil) { event.preventDefault(); toggle(); }
  }, true);
  document.addEventListener('pointerdown', event => {
    if (press) { cancelPress(); return; }
    const button = trigger(event);
    if (!button || !['touch', 'pen'].includes(event.pointerType) || event.isPrimary === false) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, target: button };
    press.timer = window.setTimeout(() => {
      if (!press || !press.target.isConnected || document.hidden) { cancelPress(); return; }
      suppressUntil = Date.now() + 1000;
      cancelPress(); toggle();
    }, 700);
  }, { passive: true });
  document.addEventListener('pointermove', event => {
    if (press && event.pointerId === press.id && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) cancelPress();
  }, { passive: true });
  document.addEventListener('pointerup', cancelPress, { passive: true });
  document.addEventListener('pointercancel', cancelPress, { passive: true });
  document.addEventListener('contextmenu', event => {
    if (trigger(event) && (press || Date.now() < suppressUntil)) event.preventDefault();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelPress(); hideQuote(); finishWake(); } });
  reduce?.addEventListener?.('change', () => { if (reduce.matches) finishWake(); });
  window.addEventListener('pagehide', finishWake);
  window.addEventListener('blur', cancelPress);
  document.addEventListener('pjax:send', () => { cancelPress(); hideQuote(); finishWake(); previousMeta = null; });
  document.addEventListener('pjax:complete', () => { syncControls(); if (active) colorMeta('#11152d'); });
  new MutationObserver(() => {
    if (active && root.getAttribute('data-theme') !== 'dark') exit(false);
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function init() {
    try {
      const record = JSON.parse(window.sessionStorage.getItem(key));
      if (record?.version === 1 && ['light', 'dark'].includes(record.theme)) enter(record.theme);
    } catch (_) { /* Ignore corrupt or inaccessible tab storage. */ }
    syncControls();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
