import { articlesDb } from '../db/articles.js';
import { sanitizeHeroPublicResponseArr } from '../db/articles.shared.js';
import { clearUnifiedPublicFeedCache } from './unifiedPublicFeedCache.js';
import { clearPopularMemCache } from './popularMemCache.js';
import { recordHeadlinesHeroSuccess, runWithReadDeadline } from './publicReadSoftFail.js';

/** @type {{ key: string, expiresAt: number, rows: unknown[] } | null} */
let headlineMemEntry = null;

/** 승인·게시 직후 최신 히어로 목록이 바로 반영되도록 메모리 캐시 무효화 */
export function clearHeadlineMemCache() {
  headlineMemEntry = null;
}

/**
 * 홈 공개 피드 관련 서버 메모리 캐시 전부 무효화
 * (히어로 메모리 캐시 — latest 목록은 DB 직조회이나 동일 트랜잭션에서 함께 호출)
 */
export function clearHomePublicFeedCaches() {
  clearHeadlineMemCache();
  clearUnifiedPublicFeedCache();
  clearPopularMemCache();
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
  const raw = await runWithReadDeadline(() => articlesDb.listPublishedLatestHero(limit));
  const rows = sanitizeHeroPublicResponseArr(raw);
  const dbMs = Date.now() - db0;
  recordHeadlinesHeroSuccess(rows);
  if (ttl > 0) {
    headlineMemEntry = { key, expiresAt: now + ttl, rows };
  } else {
    headlineMemEntry = null;
  }
  return { rows, cacheHit: false, dbMs };
}
