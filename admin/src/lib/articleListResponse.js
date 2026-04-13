/**
 * GET /api/articles returns a JSON array from this backend; normalize edge shapes and log mismatches.
 */
export function normalizeArticlesListResponse(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.articles)) return data.articles;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * When the response is OK but the JSON looks like an error envelope (error/code) and the normalized list is empty,
 * dashboards may show the last cached rows instead of a blank table.
 */
export function shouldTryStaleArticleList(res, rawData, list) {
  if (!res || !res.ok) return false;
  if (res.status === 401 || res.status === 403) return false;
  if (!Array.isArray(list) || list.length > 0) return false;
  if (Array.isArray(rawData)) return false;
  if (!rawData || typeof rawData !== 'object') return false;
  if (rawData.error != null && rawData.error !== '') return true;
  if (rawData.code != null && String(rawData.code).trim() !== '') return true;
  return false;
}

/**
 * @param {string} label e.g. staff-dashboard
 * @param {{ durationMs?: number }} [opts]
 */
export function logArticlesListResponseShape(label, res, rawData, list, opts) {
  try {
    const durationMs = opts && typeof opts.durationMs === 'number' ? opts.durationMs : undefined;
    const ok = res && res.ok;
    const isArr = Array.isArray(rawData);
    const base = { status: res.status, len: list.length, durationMs };
    if (ok && !isArr) {
      const keys = rawData && typeof rawData === 'object' ? Object.keys(rawData) : [];
      console.warn(`[nw/staff-articles] ${label} body is not an array`, {
        ...base,
        keys,
        normalizedLen: list.length,
      });
    } else if (ok && isArr) {
      if (list.length === 0) {
        console.info(`[nw/staff-articles] ${label} ok empty array (0 rows — real empty after normalize)`, base);
      } else {
        console.info(`[nw/staff-articles] ${label} ok`, base);
      }
    }
    if (ok && list.length === 0 && rawData != null && typeof rawData === 'object' && !isArr) {
      console.warn(`[nw/staff-articles] ${label} zero rows after normalize (check shape vs delay)`, {
        ...base,
        keys: Object.keys(rawData),
        error: rawData.error,
        code: rawData.code,
      });
    }
  } catch {
    /* ignore */
  }
}
