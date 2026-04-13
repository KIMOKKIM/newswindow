const NW_FEED_BC = 'nw_article_feed_v1';

/** Notify main site to refetch public feed: localStorage (other tabs) + BroadcastChannel (same origin). */
export function bumpMainArticleListCache() {
  const ts = String(Date.now());
  try {
    localStorage.setItem('nw_main_articles_invalidate', ts);
  } catch (_) {
    /* ignore */
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(NW_FEED_BC);
      bc.postMessage({ type: 'invalidate', t: Number(ts) });
      bc.close();
    }
  } catch (_) {
    /* ignore */
  }
}
