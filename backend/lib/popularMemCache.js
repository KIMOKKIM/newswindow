import { articlesDb } from '../db/articles.js';

/** @type {{ key: string, expiresAt: number, rows: unknown[] } | null} */
let popularMemEntry = null;

export function clearPopularMemCache() {
  popularMemEntry = null;
}

function popularTtlMs() {
  if (String(process.env.NW_POPULAR_CACHE_BYPASS || '').trim() === '1') return 0;
  const t = Number(process.env.NW_POPULAR_CACHE_TTL_MS);
  if (Number.isFinite(t) && t <= 0) return 0;
  return Math.min(180_000, Math.max(15_000, Number.isFinite(t) && t > 0 ? t : 60_000));
}

/**
 * 인기 기사 목록 — Supabase 부하·타임아웃 완화용 짧은 메모리 캐시
 */
export async function getPopularSinceCached(sinceMs, limit, category) {
  const cat = category != null ? String(category) : '';
  const key = `p:${sinceMs}|${limit}|${cat}`;
  const now = Date.now();
  const ttl = popularTtlMs();
  if (ttl > 0 && popularMemEntry && popularMemEntry.key === key && popularMemEntry.expiresAt > now) {
    return { rows: popularMemEntry.rows, cacheHit: true, dbMs: 0 };
  }
  const db0 = Date.now();
  const rows = await articlesDb.listPublishedPopularSince(sinceMs, limit, cat || undefined);
  const dbMs = Date.now() - db0;
  if (ttl > 0) {
    popularMemEntry = { key, expiresAt: now + ttl, rows };
  } else {
    popularMemEntry = null;
  }
  return { rows, cacheHit: false, dbMs };
}
