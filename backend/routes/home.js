import { Router } from 'express';
import { articlesDb } from '../db/articles.js';
import { loadPublicAdsConfig, buildFallbackAdsConfig } from './ads.js';
import { mainFeedArticleCap, sanitizeForPublicListPayloadArr } from '../db/articles.shared.js';

export const homeRouter = Router();

const POPULAR_DAYS = 30;
const POPULAR_LIMIT = 10;

async function timeSegment(_label, fn) {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { ok: true, value, ms: Date.now() - t0, err: null };
  } catch (err) {
    return { ok: false, value: null, ms: Date.now() - t0, err };
  }
}

function loadAdsForHome() {
  return loadPublicAdsConfig();
}

/** In-memory cache for GET /api/home/headlines — reduces duplicate Supabase work under main-page burst. */
const HEADLINE_MEM_TTL_MS = Math.min(
  120_000,
  Math.max(30_000, Number(process.env.NW_HEADLINE_CACHE_TTL_MS) || 45_000),
);
/** @type {{ key: string, expiresAt: number, rows: unknown[] } | null} */
let headlineMemEntry = null;

async function getHeadlinesRowsCached(limit) {
  const key = `n:${limit}`;
  const now = Date.now();
  if (headlineMemEntry && headlineMemEntry.key === key && headlineMemEntry.expiresAt > now) {
    return { rows: headlineMemEntry.rows, cacheHit: true, dbMs: 0 };
  }
  const db0 = Date.now();
  const rows = await articlesDb.listPublishedLatestHero(limit);
  const dbMs = Date.now() - db0;
  headlineMemEntry = { key, expiresAt: now + HEADLINE_MEM_TTL_MS, rows };
  return { rows, cacheHit: false, dbMs };
}

/** Lightweight first paint: hero rows only (no ads/popular). GET /api/home/headlines?limit=5 */
homeRouter.get('/headlines', async (req, res, next) => {
  const wall0 = Date.now();
  try {
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
    const { rows, cacheHit, dbMs } = await getHeadlinesRowsCached(limit);
    const totalMs = Date.now() - wall0;
    const concurrentSuspicion = !cacheHit && dbMs > 2500;
    const logLine = {
      totalMs,
      dbMs,
      cache: cacheHit ? 'HIT' : 'MISS',
      limit,
      rowCount: rows.length,
      concurrentSuspicion,
      memTtlMs: HEADLINE_MEM_TTL_MS,
    };
    if (totalMs > 1500 || concurrentSuspicion) {
      console.warn('[nw/home/headlines]', JSON.stringify(logLine));
    } else {
      console.log('[nw/home/headlines]', JSON.stringify(logLine));
    }
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=60');
    res.set('X-NW-Home-Headlines-Ms', String(totalMs));
    res.set('X-NW-Headlines-Db-Ms', String(dbMs));
    res.set('X-NW-Cache', cacheHit ? 'HIT' : 'MISS');
    res.set(
      'Access-Control-Expose-Headers',
      'X-NW-Home-Headlines-Ms, X-NW-Headlines-Db-Ms, X-NW-Cache',
    );
    res.json({
      latestHero: rows,
      _meta: { ms: totalMs, dbMs, cache: cacheHit ? 'HIT' : 'MISS', limit, rowCount: rows.length },
    });
  } catch (e) {
    next(e);
  }
});

/** Main bundle: latest required; popular/ads may be partial on failure. */
homeRouter.get('/', async (req, res, next) => {
  const wall0 = Date.now();
  const sinceMs = Date.now() - POPULAR_DAYS * 24 * 60 * 60 * 1000;

  const rL = await timeSegment('latest', () => articlesDb.listPublishedForMain());
  if (!rL.ok || !Array.isArray(rL.value)) {
    const err = rL.err || new Error('latest failed');
    console.error('[nw/home] fatal latest', err && err.message);
    return next(err);
  }

  const [rP, rA] = await Promise.all([
    timeSegment('popular', () => articlesDb.listPublishedPopularSince(sinceMs, POPULAR_LIMIT)),
    timeSegment('ads', () => loadAdsForHome()),
  ]);

  const latestArticles = sanitizeForPublicListPayloadArr(rL.value);
  const popularArticles = sanitizeForPublicListPayloadArr(
    rP.ok && Array.isArray(rP.value) ? rP.value : [],
  );
  const ads = rA.ok && rA.value ? rA.value : buildFallbackAdsConfig();

  const partial = {
    popular: !rP.ok,
    ads: !rA.ok,
  };

  const wallMs = Date.now() - wall0;
  if (wallMs > 8000) {
    console.warn('[nw/home] slow bundle', JSON.stringify({ wallMs, latestMs: rL.ms, popularMs: rP.ms, adsMs: rA.ms }));
  }
  const body = {
    latestArticles,
    popularArticles,
    ads,
    _homePartial: partial,
  };
  const cap = mainFeedArticleCap();

  const diagRequested =
    String(process.env.NW_HOME_DIAG || '').trim() === '1' &&
    String(req.query.diag || '').trim() === '1';
  if (diagRequested) {
    try {
      const publishedTotal = await articlesDb.countPublished();
      body._meta = {
        mainFeedCap: cap,
        latestReturned: latestArticles.length,
        publishedTotal,
        feedAtCap: publishedTotal > cap && latestArticles.length >= cap,
        timingsMs: {
          wall: wallMs,
          latest: rL.ms,
          popular: rP.ms,
          ads: rA.ms,
        },
        partial,
      };
    } catch (e) {
      body._meta = { timingsMs: { wall: wallMs, latest: rL.ms, popular: rP.ms, ads: rA.ms }, partial, diagCountErr: true };
    }
  }

  let payloadStr = JSON.stringify(body);
  let jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
  if (diagRequested && body._meta) {
    body._meta.jsonBytes = jsonBytes;
    payloadStr = JSON.stringify(body);
    jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
  }

  const partialTags = [partial.popular && 'popular', partial.ads && 'ads'].filter(Boolean).join(',') || 'none';

  res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  res.set('Vary', 'Accept-Encoding');
  res.set(
    'Server-Timing',
    `latest;dur=${rL.ms}, popular;dur=${rP.ms}, ads;dur=${rA.ms}, total;dur=${wallMs}`,
  );
  res.set('X-NW-Home-Timing-Wall-Ms', String(wallMs));
  res.set('X-NW-Home-Timing-Latest-Ms', String(rL.ms));
  res.set('X-NW-Home-Timing-Popular-Ms', String(rP.ms));
  res.set('X-NW-Home-Timing-Ads-Ms', String(rA.ms));
  res.set('X-NW-Home-Json-Bytes', String(jsonBytes));
  res.set('X-NW-Home-Partial', partialTags);
  res.set('X-NW-Home-Latest-Ok', '1');
  res.set('X-NW-Home-Popular-Ok', rP.ok ? '1' : '0');
  res.set('X-NW-Home-Ads-Ok', rA.ok ? '1' : '0');

  console.log(
    '[nw/home]',
    JSON.stringify({
      wallMs,
      latestMs: rL.ms,
      popularMs: rP.ms,
      adsMs: rA.ms,
      jsonBytes,
      latestLen: latestArticles.length,
      popularLen: popularArticles.length,
      adsHomeCacheHit: false,
      partial,
      popularError: rP.ok ? null : rP.err && rP.err.message,
      adsError: rA.ok ? null : rA.err && rA.err.message,
    }),
  );

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(payloadStr);
});
