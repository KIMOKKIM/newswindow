import { clearHomePublicFeedCaches } from './headlineMemCache.js';

/**
 * After article create/update/approve/reject: clear in-memory public feed caches
 * (hero/headlines, unified public-list slice, most-viewed/popular) so the next read sees fresh DB rows.
 */
export function invalidateArticleDerivedCaches(meta = {}) {
  clearHomePublicFeedCaches();
  console.info(
    '[nw/cache-invalidate]',
    JSON.stringify({
      reason: meta.reason || 'article-mutation',
      reqId: meta.reqId,
      articleId: meta.articleId,
      status: meta.status,
      role: meta.role,
    }),
  );
}
