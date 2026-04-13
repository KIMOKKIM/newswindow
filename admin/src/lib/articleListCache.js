/** Session fallback so a failed refetch does not wipe a previously good dashboard table. */

export const ARTICLE_LIST_CACHE_STAFF = 'nw_dashboard_staff_articles_v1';
export const ARTICLE_LIST_CACHE_REPORTER = 'nw_dashboard_reporter_articles_v1';

/**
 * @param {string} key
 * @returns {unknown[] | null}
 */
export function readCachedArticleList(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !Array.isArray(o.rows)) return null;
    return o.rows;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown[]} rows
 */
export function writeCachedArticleList(key, rows) {
  try {
    if (!Array.isArray(rows)) return;
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), rows }));
  } catch {
    /* quota / private mode */
  }
}
