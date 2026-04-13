/**
 * In-memory unified public feed rows (sorted).
 * Invalidated on approve/publish via clearHomePublicFeedCaches().
 */

/** @type {unknown[] | null} */
let cachedRows = null;

/** @type {Promise<unknown[]> | null} */
let inFlight = null;

export function clearUnifiedPublicFeedCache() {
  cachedRows = null;
  inFlight = null;
}

/**
 * @param {() => Promise<unknown[]>} loader
 */
export async function getUnifiedPublicFeedCached(loader) {
  if (String(process.env.NW_UNIFIED_FEED_CACHE_BYPASS || '').trim() === '1') {
    return loader();
  }
  if (cachedRows) return cachedRows;
  if (!inFlight) {
    inFlight = loader()
      .then((rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        // Do not cache an empty array (avoids sticky empty after a bad read).
        if (arr.length > 0) cachedRows = arr;
        else cachedRows = null;
        inFlight = null;
        return arr;
      })
      .catch((e) => {
        inFlight = null;
        throw e;
      });
  }
  return inFlight;
}
