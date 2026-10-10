(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BlogMoonDreamCore = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  function cleanPosts(data, origin) {
    if (data?.version !== 1 || !Array.isArray(data.posts)) return [];
    const seen = new Set();
    return data.posts.flatMap(post => {
      if (!post || typeof post.title !== 'string' || !post.title.trim() || typeof post.href !== 'string' || !post.href.startsWith('/') || post.href.startsWith('//')) return [];
      try {
        const url = new URL(post.href, origin);
        if (url.origin !== origin || seen.has(url.pathname)) return [];
        seen.add(url.pathname);
        const clean = { href: url.pathname, title: post.title.trim().slice(0, 200), category: typeof post.category === 'string' && post.category.trim() ? post.category.trim().slice(0, 80) : '随笔' };
        if (['creation', 'growth', 'daily'].includes(post.dream)) clean.dream = post.dream;
        return [clean];
      } catch (_) { return []; }
    });
  }
  function pickPost(posts, previous, random = Math.random) {
    const choices = posts.length > 1 ? posts.filter(post => post.href !== previous) : posts;
    return choices.length ? choices[Math.floor(random() * choices.length)] : null;
  }
  function dreamPosts(posts, dream) {
    if (!['creation', 'growth', 'daily'].includes(dream)) return [];
    return posts.filter(post => post.dream === dream).slice(0, 3);
  }
  return { cleanPosts, pickPost, dreamPosts };
});
