import { Router } from 'express';
import { articlesDb } from '../db/articles.js';
import { loadPublicAdsConfig, buildFallbackAdsConfig } from './ads.js';
import {
  mainFeedArticleCap,
  sanitizeForPublicListPayloadArr,
  toHomeBundleLatestMin,
  toHomeBundlePopularMin,
} from '../db/articles.shared.js';
import { getHeadlinesRowsCached } from '../lib/headlineMemCache.js';
import { getPopularSinceCached } from '../lib/popularMemCache.js';
import { tracePublicFeedPresence } from '../lib/publicFeedTrace.js';

export const homeRouter = Router();

const POPULAR_DAYS = 30;
const POPULAR_LIMIT = 10;

function headlineMemTtlForLog() {
  if (String(process.env.NW_HEADLINE_CACHE_BYPASS || '').trim() === '1') return 0;
  const t = Number(process.env.NW_HEADLINE_CACHE_TTL_MS);
  if (Number.isFinite(t) && t <= 0) return 0;
  return Math.min(120_000, Math.max(30_000, Number.isFinite(t) && t > 0 ? t : 45_000));
}

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

/** Lightweight first paint: hero rows only (no ads/popular). GET /api/home/headlines?limit=5 */
homeRouter.get('/headlines', async (req, res, next) => {
  const wall0 = Date.now();
  try {
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
    const unified = await articlesDb.getUnifiedPublicFeedRecords();
    tracePublicFeedPresence(
      'pipeline.unifiedPublicFeed',
      unified.slice(0, limit).map((r) => ({ id: r.id, title: r.title })),
      { sliceNote: 'headlines cap' },
    );
    const { rows, cacheHit, dbMs } = await getHeadlinesRowsCached(limit);
    tracePublicFeedPresence(
      'api/home/headlines',
      rows.map((r) => ({ id: r.id, title: r.title })),
      { cache: cacheHit ? 'HIT' : 'MISS' },
    );
    const totalMs = Date.now() - wall0;
    const concurrentSuspicion = !cacheHit && dbMs > 2500;
    const logLine = {
      totalMs,
      dbMs,
      cache: cacheHit ? 'HIT' : 'MISS',
      limit,
      rowCount: rows.length,
      concurrentSuspicion,
      memTtlMs: headlineMemTtlForLog(),
    };
    if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
      logLine.heroIds = rows.map((r) => r && r.id);
    }
    if (totalMs > 1500 || concurrentSuspicion) {
      console.warn('[nw/home/headlines]', JSON.stringify(logLine));
    } else {
      console.log('[nw/home/headlines]', JSON.stringify(logLine));
    }
    if (String(process.env.NW_PUBLIC_HEADLINES_NO_STORE || '').trim() === '1') {
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    } else {
      res.set('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=60');
    }
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
    (async () => {
      const t0 = Date.now();
      try {
        const pr = await getPopularSinceCached(sinceMs, POPULAR_LIMIT, '');
        return {
          ok: true,
          value: pr.rows,
          ms: Date.now() - t0,
          err: null,
          cacheHit: pr.cacheHit,
          dbMs: pr.dbMs,
        };
      } catch (err) {
        return { ok: false, value: [], ms: Date.now() - t0, err, cacheHit: false, dbMs: 0 };
      }
    })(),
    timeSegment('ads', () => loadAdsForHome()),
  ]);

  tracePublicFeedPresence(
    'api/home.latestArticles',
    rL.value.map((r) => ({ id: r.id, title: r.title })),
    { cap: mainFeedArticleCap(), len: rL.value.length },
  );
  const latestArticles = toHomeBundleLatestMin(sanitizeForPublicListPayloadArr(rL.value));
  const popularArticles = toHomeBundlePopularMin(
    sanitizeForPublicListPayloadArr(rP.ok && Array.isArray(rP.value) ? rP.value : []),
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

  if (String(process.env.NW_PUBLIC_HOME_BUNDLE_NO_STORE || '').trim() === '1') {
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  } else {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
  }
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
  res.set('X-NW-Home-Popular-Cache', rP.cacheHit ? 'HIT' : 'MISS');

  const homeLog = {
    wallMs,
    latestMs: rL.ms,
    popularMs: rP.ms,
    adsMs: rA.ms,
    popularCacheHit: !!rP.cacheHit,
    popularDbMs: rP.dbMs,
    jsonBytes,
    latestLen: latestArticles.length,
    popularLen: popularArticles.length,
    adsHomeCacheHit: false,
    partial,
    popularError: rP.ok ? null : rP.err && rP.err.message,
    adsError: rA.ok ? null : rA.err && rA.err.message,
  };
  if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
    homeLog.latestIds = (rL.value || []).slice(0, 50).map((x) => x && x.id);
  }
  console.log('[nw/home]', JSON.stringify(homeLog));

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(payloadStr);
});
