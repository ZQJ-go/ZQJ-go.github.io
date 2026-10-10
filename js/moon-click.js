(() => {
  'use strict';
  if (window.__moonClickInstalled) return;
  window.__moonClickInstalled = true;
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const live = new Map();
  const active = () => root.getAttribute('data-moon-mode') === 'on' && !root.hasAttribute('data-moon-leaving');
  const ns = 'http://www.w3.org/2000/svg';
  const duration = 1000;
  function shape(name, attrs, parent) {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  }
  // Build once: every click clones a self-contained vector with no asset requests.
  const eye = shape('svg', { viewBox: '0 0 168 168', class: 'moon-click-art', focusable: 'false' });
  shape('circle', { cx: 84, cy: 84, r: 63, class: 'moon-click-disc' }, eye);
  const orbit = shape('g', { class: 'moon-click-orbit' }, eye);
  shape('circle', { cx: 84, cy: 84, r: 74, class: 'moon-click-rim' }, orbit);
  shape('circle', { cx: 84, cy: 84, r: 78, class: 'moon-click-arcs', 'stroke-dasharray': '26 96.52' }, orbit);
  for (let angle = 0; angle < 360; angle += 90) {
    shape('path', { d: 'M84 4 L86 9 L84 14 L82 9 Z', class: 'moon-click-spark', transform: `rotate(${angle} 84 84)` }, orbit);
  }
  const pattern = shape('g', { class: 'moon-click-pattern' }, eye);
  for (const [radius, phase] of [[20, 0], [40, 60], [60, 0]]) {
    shape('circle', { cx: 84, cy: 84, r: radius, class: 'moon-click-eye-ring' }, pattern);
    for (let i = 0; i < 3; i++) {
      const angle = phase + i * 120;
      shape('path', {
        d: 'M-1-4 C-5-5-7-1-5 3 C-3 6 2 6 4 3 C6 0 5-3 4-5 C2-7 3-10 6-12 C1-10 0-7-1-4Z',
        class: 'moon-click-tomoe', transform: `rotate(${angle} 84 84) translate(84 ${84 - radius})`
      }, pattern);
    }
  }
  shape('circle', { cx: 84, cy: 84, r: 11, class: 'moon-click-core-halo' }, eye);
  shape('circle', { cx: 84, cy: 84, r: 6, class: 'moon-click-core' }, eye);
  shape('circle', { cx: 84, cy: 84, r: 2.2, class: 'moon-click-pupil' }, eye);
  function remove(echo) {
    window.clearTimeout(live.get(echo));
    live.delete(echo);
    echo.remove();
  }
  function clear() { for (const echo of [...live.keys()]) remove(echo); }
  document.addEventListener('click', event => {
    if (!active() || reduce.matches || document.hidden || event.detail <= 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    if (live.size >= 4) remove(live.keys().next().value);
    const echo = document.createElement('span');
    echo.className = 'moon-click-echo';
    echo.setAttribute('aria-hidden', 'true');
    echo.style.left = event.clientX + 'px';
    echo.style.top = event.clientY + 'px';
    echo.append(eye.cloneNode(true));
    document.body.append(echo);
    live.set(echo, window.setTimeout(() => remove(echo), duration));
  });
  new MutationObserver(() => { if (!active()) clear(); }).observe(root, { attributes: true, attributeFilter: ['data-moon-mode'] });
  document.addEventListener('blog:moon-mode-change', event => { if (!event.detail.active) clear(); });
  document.addEventListener('pjax:send', clear);
  document.addEventListener('blog:moon-wake-start', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  reduce.addEventListener?.('change', () => { if (reduce.matches) clear(); });
})();
