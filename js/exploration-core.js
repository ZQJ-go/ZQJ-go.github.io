(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BlogExplorationCore = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const KEY = 'tsukikage.exploration.v1';
  const IDS = ['read', 'work', 'kamui', 'moon'];

  function createStore(storage, now = Date.now) {
    let unlocked = {};
    let persistent = Boolean(storage);
    function parse(raw) {
      try {
        const record = JSON.parse(raw);
        if (!record || record.version !== 1 || !record.unlocked) return {};
        const clean = {};
        IDS.forEach(id => {
          const value = record.unlocked[id];
          if (Number.isFinite(value) && value > 0 && value <= now()) clean[id] = Math.floor(value);
        });
        return clean;
      } catch (_) { return {}; }
    }
    function read() {
      if (!persistent) return {};
      try { return parse(storage.getItem(KEY)); }
      catch (_) { persistent = false; return {}; }
    }
    function write() {
      if (!persistent) return;
      try { storage.setItem(KEY, JSON.stringify({ version: 1, unlocked })); }
      catch (_) { persistent = false; }
    }
    function refresh() {
      const remote = read();
      IDS.forEach(id => {
        if (remote[id]) unlocked[id] = unlocked[id] ? Math.min(unlocked[id], remote[id]) : remote[id];
      });
      // Reconcile simultaneous tab writes without bouncing identical storage events.
      if (IDS.some(id => unlocked[id] !== remote[id])) write();
    }
    refresh();
    return {
      snapshot: () => ({ ...unlocked }),
      get persistent() { return persistent; },
      refresh,
      unlock(id) {
        if (!IDS.includes(id)) return false;
        refresh();
        if (unlocked[id]) return false;
        unlocked[id] = now();
        write();
        return true;
      }
    };
  }

  function createVisit({ store, isWork = false, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onUnlock }) {
    let elapsed = 0, started = 0, timer = null, generation = 0;
    let active = false, disposed = false;
    const ids = isWork ? ['read', 'work'] : ['read'];
    let finished = ids.every(id => store.snapshot()[id]);
    function pause() {
      if (active) elapsed += Math.max(0, now() - started);
      active = false;
      if (timer !== null) clearTimer(timer);
      timer = null;
      generation++;
    }
    return {
      setActive(next) {
        if (disposed || finished || active === next) return;
        if (!next) { pause(); return; }
        active = true;
        started = now();
        const token = ++generation;
        timer = setTimer(() => {
          if (disposed || !active || generation !== token) return;
          timer = null;
          active = false;
          finished = true;
          ids.forEach(id => { if (store.unlock(id)) onUnlock(id); });
        }, Math.max(0, 8000 - elapsed));
      },
      dispose() { pause(); disposed = true; }
    };
  }
  return { KEY, IDS, createStore, createVisit };
});
