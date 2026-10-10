(() => {
  'use strict';
  if (window.__moonDreamInstalled || !window.BlogMoonDreamCore) return;
  window.__moonDreamInstalled = true;
  const core = window.BlogMoonDreamCore, root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let scene = null, controls = null, observer = null, inView = true;
  let cache = null, lastHref = null, controller = null, requestTimer = null, generation = 0;
  let entryTimer = null, rippleTimer = null, frame = null, pointer = null;
  let memorySource = null;
  const dreams = { creation: '创造之梦', growth: '成长之梦', daily: '日常之梦' };
  const active = () => root.getAttribute('data-moon-mode') === 'on' && !root.hasAttribute('data-moon-leaving');

  function pauseMotion() {
    root.toggleAttribute('data-moon-paused', !active() || !scene || !inView || document.hidden || reduce.matches);
    if (root.hasAttribute('data-moon-paused')) resetParallax();
  }
  function resetParallax() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null; pointer = null;
    if (scene) { scene.style.removeProperty('--moon-look-x'); scene.style.removeProperty('--moon-look-y'); }
  }
  function resetRequest() {
    generation++;
    if (controller) controller.abort();
    controller = null;
    window.clearTimeout(requestTimer); requestTimer = null;
    if (controls) {
      controls.querySelector('[data-moon-pick]').disabled = false;
      controls.querySelector('[data-moon-pick-label]').textContent = '拾取梦境';
      controls.querySelector('[data-moon-memory]').hidden = true;
    }
    scene?.querySelectorAll('[data-moon-fragment]').forEach(node => node.setAttribute('aria-expanded', 'false'));
    memorySource = null;
  }
  function clearEffects() {
    window.clearTimeout(entryTimer); window.clearTimeout(rippleTimer);
    entryTimer = null; rippleTimer = null;
    if (scene) scene.classList.remove('is-entering', 'is-rippling');
    resetParallax();
  }
  function sync() {
    const on = active();
    // Keep decorative moon/stars through the whole dissolve while interaction stops immediately.
    const visible = root.getAttribute('data-moon-mode') === 'on' ||
      (root.hasAttribute('data-moon-leaving') && !root.hasAttribute('data-moon-wake-view'));
    if (scene) scene.hidden = !visible;
    if (on && scene) {
      const surface = scene.querySelector('[data-moon-surface]');
      if (surface && !surface.hasAttribute('href')) surface.setAttribute('href', surface.getAttribute('data-moon-surface'));
    }
    if (controls) controls.hidden = !visible;
    document.querySelectorAll('[data-moon-exit]').forEach(button => { button.hidden = !visible; });
    if (!on) { resetRequest(); clearEffects(); }
    pauseMotion();
  }
  function bind() {
    resetRequest(); clearEffects();
    if (observer) observer.disconnect();
    observer = null;
    scene = document.querySelector('[data-moon-scene]');
    controls = document.querySelector('[data-moon-controls]');
    inView = true;
    sync();
    if (scene && window.IntersectionObserver) {
      const target = scene;
      const current = new window.IntersectionObserver(entries => {
        if (scene !== target || observer !== current) return;
        const entry = entries.find(item => item.target === target);
        if (entry) { inView = entry.isIntersecting; pauseMotion(); }
      });
      observer = current; observer.observe(target);
    }
  }

  async function pick(dream = null, source = null) {
    if (!active() || !controls) return;
    if (dream !== null && !Object.hasOwn(dreams, dream)) return;
    const current = controls, button = current.querySelector('[data-moon-pick]');
    if (dream === null && button.disabled) return;
    resetRequest();
    memorySource = source || button;
    source?.setAttribute('aria-expanded', 'true');
    const token = ++generation;
    const memory = current.querySelector('[data-moon-memory]'), content = current.querySelector('[data-moon-memory-content]');
    const status = current.querySelector('[data-moon-memory-status]'), link = current.querySelector('[data-moon-memory-link]');
    const list = current.querySelector('[data-moon-memory-list]');
    button.disabled = true; current.querySelector('[data-moon-pick-label]').textContent = '寻找记忆…';
    memory.hidden = false; content.hidden = true; link.hidden = true; link.removeAttribute('href');
    list.hidden = true; list.replaceChildren();
    status.textContent = dream ? '正在展开' + dreams[dream] + '…' : '正在寻找一段记忆…';
    try {
      if (!cache) {
        controller = new AbortController();
        const signal = controller.signal;
        requestTimer = window.setTimeout(() => controller?.abort(), 6000);
        const response = await window.fetch(current.dataset.moonIndex, { signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('request');
        const data = await response.json();
        if (token !== generation || !active() || controls !== current || !current.isConnected) return;
        cache = core.cleanPosts(data, window.location.origin);
      }
      if (token !== generation || !active() || controls !== current || !current.isConnected) return;
      if (dream) {
        const posts = core.dreamPosts(cache, dream);
        if (!posts.length) { status.textContent = '这段梦境目前还没有文章。'; return; }
        status.textContent = dreams[dream] + ' · ' + posts.length + ' 段记忆';
        posts.forEach((post, index) => {
          const item = document.createElement('li'), entry = document.createElement('a');
          const number = document.createElement('span'), title = document.createElement('span'), arrow = document.createElement('span');
          number.className = 'moon-memory-number'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
          title.className = 'moon-memory-entry-title'; title.textContent = post.title;
          arrow.className = 'moon-memory-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
          entry.href = post.href; entry.append(number, title, arrow); item.append(entry); list.append(item);
        });
        list.hidden = false;
        return;
      }
      const post = core.pickPost(cache, lastHref);
      if (!post) { status.textContent = '目前没有可拾取的文章。'; return; }
      lastHref = post.href;
      current.querySelector('[data-moon-memory-title]').textContent = post.title;
      current.querySelector('[data-moon-memory-category]').textContent = post.category;
      link.href = post.href; link.setAttribute('aria-label', '进入这段记忆：' + post.title);
      status.textContent = '拾得一段 ' + post.category + ' 记忆';
      content.hidden = false; link.hidden = false;
    } catch (_) {
      if (token === generation && active() && controls === current) status.textContent = '梦境暂时无法拾取，请再试一次。';
    } finally {
      if (token === generation) {
        window.clearTimeout(requestTimer); requestTimer = null; controller = null;
        button.disabled = false; current.querySelector('[data-moon-pick-label]').textContent = '拾取梦境';
      }
    }
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !active()) return;
    if (event.target.closest('[data-moon-pick]')) pick();
    const fragment = event.target.closest('[data-moon-fragment]');
    if (fragment && scene?.contains(fragment)) pick(fragment.dataset.moonFragment, fragment);
    if (event.target.closest('[data-moon-memory-close]')) {
      const source = memorySource;
      resetRequest(); (source?.isConnected ? source : controls?.querySelector('[data-moon-pick]'))?.focus({ preventScroll: true });
    }
    if (event.target.closest('[data-moon-whisper]') && scene && !reduce.matches) {
      window.clearTimeout(rippleTimer);
      scene.classList.remove('is-rippling'); void scene.offsetWidth;
      scene.classList.add('is-rippling');
      rippleTimer = window.setTimeout(() => scene?.classList.remove('is-rippling'), 1400);
    }
  });
  document.addEventListener('blog:moon-mode-change', event => {
    sync();
    if (event.detail.entering && scene && !reduce.matches) {
      window.clearTimeout(entryTimer); scene.classList.add('is-entering');
      entryTimer = window.setTimeout(() => scene?.classList.remove('is-entering'), 1050);
    }
  });
  document.addEventListener('blog:moon-wake-start', () => {
    resetRequest(); clearEffects(); pauseMotion();
  });
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-moon-mode', 'data-moon-leaving'] });
  document.addEventListener('visibilitychange', () => { pauseMotion(); if (document.hidden) { clearEffects(); resetRequest(); } });
  reduce.addEventListener?.('change', () => { pauseMotion(); if (reduce.matches) clearEffects(); });
  document.addEventListener('pointermove', event => {
    if (!scene || !active() || !inView || document.hidden || reduce.matches || !finePointer.matches || event.pointerType === 'touch') return;
    if (!(event.target instanceof Element) || !event.target.closest('#page-header.full_page')) { resetParallax(); return; }
    pointer = { x: event.clientX, y: event.clientY };
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      if (!scene || !pointer) return;
      const box = scene.getBoundingClientRect();
      if (!box.width || !box.height) return;
      scene.style.setProperty('--moon-look-x', ((pointer.x - box.left) / box.width - .5) * 16 + 'px');
      scene.style.setProperty('--moon-look-y', ((pointer.y - box.top) / box.height - .5) * 12 + 'px');
    });
  }, { passive: true });
  document.addEventListener('pjax:send', () => {
    resetRequest(); clearEffects(); if (observer) observer.disconnect();
    observer = null; inView = false; pauseMotion();
  });
  document.addEventListener('pjax:complete', bind);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
