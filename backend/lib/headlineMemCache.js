import { articlesDb } from '../db/articles.js';
import { sanitizeHeroPublicResponseArr } from '../db/articles.shared.js';

/** @type {{ key: string, expiresAt: number, rows: unknown[] } | null} */
let headlineMemEntry = null;

/** 승인·게시 직후 최신 히어로 목록이 바로 반영되도록 메모리 캐시 무효화 */
export function clearHeadlineMemCache() {
  headlineMemEntry = null;
}

function headlineTtlMs() {
  if (String(process.env.NW_HEADLINE_CACHE_BYPASS || '').trim() === '1') return 0;
  const t = Number(process.env.NW_HEADLINE_CACHE_TTL_MS);
  if (Number.isFinite(t) && t <= 0) return 0;
  return Math.min(120_000, Math.max(30_000, Number.isFinite(t) && t > 0 ? t : 45_000));
}

export async function getHeadlinesRowsCached(limit) {
  const key = `n:${limit}`;
  const now = Date.now();
  const ttl = headlineTtlMs();
  if (ttl > 0 && headlineMemEntry && headlineMemEntry.key === key && headlineMemEntry.expiresAt > now) {
    return { rows: headlineMemEntry.rows, cacheHit: true, dbMs: 0 };
  }
  const db0 = Date.now();
  const rows = sanitizeHeroPublicResponseArr(await articlesDb.listPublishedLatestHero(limit));
  const dbMs = Date.now() - db0;
  if (ttl > 0) {
    headlineMemEntry = { key, expiresAt: now + ttl, rows };
  } else {
    headlineMemEntry = null;
  }
  return { rows, cacheHit: false, dbMs };
}
