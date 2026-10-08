(function () {
  'use strict';
  if (window.__kamuiInstalled) return;
  window.__kamuiInstalled = true;
  let active = null;

  function release() {
    if (!active) return;
    clearTimeout(active.timer);
    active.trigger.classList.remove('is-kamui-active');
    active.trigger.removeAttribute('aria-busy');
    active.trigger.removeAttribute('aria-disabled');
    active = null;
  }

  function showFailure(trigger) {
    const status = trigger.querySelector('.kamui-status');
    if (status) status.textContent = '神威尚未就绪，请稍后再试';
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target && event.target.closest && event.target.closest('[data-kamui]');
    if (!trigger) return;
    event.preventDefault();
    if (active) return;
    const status = trigger.querySelector('.kamui-status');
    if (status) status.textContent = '';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    active = { trigger, timer: null };
    trigger.classList.add('is-kamui-active');
    trigger.setAttribute('aria-busy', 'true');
    trigger.setAttribute('aria-disabled', 'true');
    active.timer = setTimeout(function () {
      const connected = trigger.isConnected;
      release();
      if (!connected) return;
      if (typeof window.toRandomPost !== 'function') {
        showFailure(trigger);
        return;
      }
      try {
        window.toRandomPost();
      } catch (error) {
        showFailure(trigger);
      }
    }, reduced ? 80 : 2200);
  });

  // A queued effect must never jump again after the visitor leaves its page.
  document.addEventListener('pjax:send', release);
})();
