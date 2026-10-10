(function () {
  'use strict';
  const core = window.BlogExplorationCore;
  const panel = document.getElementById('exploration-panel');
  const toast = document.getElementById('exploration-toast');
  if (!core || !panel || !toast || window.__explorationInstalled) return;
  window.__explorationInstalled = true;
  let storage = null;
  try { storage = window.localStorage; } catch (_) { /* Use an in-memory record. */ }
  const store = core.createStore(storage);
  const badges = Array.from(panel.querySelectorAll('[data-achievement]'));
  const total = badges.length;
  const names = new Map(badges.map(item => [item.dataset.achievement, item.querySelector('.exploration-badge-name').textContent]));
  const queue = [];
  let currentToast = null, toastTimer = null, returnFocus = null;
  let article = null, observer = null, visit = null, inView = false;
  const loader = document.getElementById('loading-box');
  const loading = () => loader && !loader.classList.contains('loaded');

  function render() {
    const records = store.snapshot();
    badges.forEach(item => {
      const timestamp = records[item.dataset.achievement];
      item.classList.toggle('is-unlocked', Boolean(timestamp));
      item.querySelector('.exploration-badge-state').textContent = timestamp
        ? '已解锁 · ' + new Date(timestamp).toLocaleDateString('zh-CN') : '尚未解锁';
    });
    const count = Object.keys(records).length;
    panel.querySelector('[data-exploration-count]').textContent = count + ' / ' + total + ' 已解锁';
    panel.querySelector('progress').max = total;
    panel.querySelector('progress').value = count;
    panel.querySelector('[data-exploration-note]').textContent = store.persistent
      ? '记录保存在当前浏览器的这个站点。'
      : '当前浏览器无法保存，记录仅在本次访问中保留。';
    document.querySelectorAll('[data-exploration-open]').forEach(button => {
      button.setAttribute('aria-expanded', String(panel.open));
      button.setAttribute('aria-label', '探索记录，已解锁 ' + count + ' 项，共 ' + total + ' 项');
      button.title = '探索记录 · ' + count + '/' + total;
    });
  }

  function syncToast() {
    if (document.hidden || loading()) {
      if (toastTimer !== null) clearTimeout(toastTimer);
      toastTimer = null;
      if (currentToast) queue.unshift(currentToast);
      currentToast = null;
      toast.hidden = true;
      return;
    }
    if (currentToast || !queue.length) return;
    currentToast = queue.shift();
    toast.querySelector('[data-exploration-toast-text]').textContent = '成就解锁：' + names.get(currentToast);
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      currentToast = null;
      toastTimer = null;
      syncToast();
    }, 3600);
  }

  function celebrate(id) { render(); queue.push(id); syncToast(); }
  function syncVisit() {
    if (visit) visit.setActive(inView && !document.hidden && !loading() && !panel.open);
  }
  function releaseVisit() {
    if (observer) observer.disconnect();
    if (visit) visit.dispose();
    observer = null; visit = null; article = null; inView = false;
  }
  function bindVisit() {
    releaseVisit();
    article = document.querySelector('[data-exploration-article]');
    render();
    if (!article || !window.IntersectionObserver) return;
    visit = core.createVisit({ store, isWork: article.dataset.explorationWork === 'true', onUnlock: celebrate });
    const target = article;
    const currentObserver = new window.IntersectionObserver(entries => {
      if (article !== target || observer !== currentObserver) return;
      const entry = entries.find(item => item.target === target);
      if (!entry) return;
      inView = entry.isIntersecting;
      syncVisit();
    }, { threshold: 0 });
    observer = currentObserver;
    observer.observe(article);
  }

  function closePanel() {
    if (!panel.open) return;
    panel.close();
  }
  panel.addEventListener('close', () => {
    render(); syncVisit();
    const button = returnFocus && returnFocus.isConnected ? returnFocus : document.querySelector('[data-exploration-open]');
    if (button) button.focus({ preventScroll: true });
  });
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel();
  });
  document.addEventListener('click', event => {
    const open = event.target.closest('[data-exploration-open]');
    if (open) {
      returnFocus = open;
      store.refresh(); render();
      if (!panel.open) panel.showModal();
      render(); syncVisit();
    } else if (event.target.closest('[data-exploration-close]')) closePanel();
  });
  document.addEventListener('blog:kamui-start', () => { if (store.unlock('kamui')) celebrate('kamui'); });
  document.addEventListener('blog:moon-mode-start', () => { if (store.unlock('moon')) celebrate('moon'); });
  document.addEventListener('visibilitychange', () => { syncVisit(); syncToast(); });
  document.addEventListener('pjax:send', () => { releaseVisit(); closePanel(); });
  document.addEventListener('pjax:complete', bindVisit);
  window.addEventListener('storage', event => {
    if (event.key !== core.KEY) return;
    store.refresh(); render();
  });
  if (loader && window.MutationObserver) {
    new window.MutationObserver(() => { syncVisit(); syncToast(); }).observe(loader, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindVisit, { once: true });
  else bindVisit();
})();
