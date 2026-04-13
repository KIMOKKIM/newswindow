import { clearHomePublicFeedCaches } from './headlineMemCache.js';
import { clearEmergencyApiShieldCache } from './emergencyApiShield.js';

/**
 * After article create/update/approve/reject: clear in-memory public feed caches
 * (hero/headlines, unified public-list slice, most-viewed/popular, emergency route coalescing)
 * so the next read sees fresh DB rows.
 */
export function invalidateArticleDerivedCaches(meta = {}) {
  clearHomePublicFeedCaches();
  clearEmergencyApiShieldCache();
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
