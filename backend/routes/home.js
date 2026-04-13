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
import {
  classifyUpstreamError,
  fallbackHeadlinesHero,
  fallbackHomeLatestMin,
  isPublicReadSoftFailEnabled,
  logPublicSoftfail,
  NW_DEGRADED_REASON_HEADER,
  publicReadDeadlineMs,
  recordHomeLatestMinSuccess,
  runWithReadDeadline,
  upstreamPrimaryCategory,
} from '../lib/publicReadSoftFail.js';

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
    /** 통합 피드 전량 로드 금지 — headlines는 캐시+listPublishedLatestHero만(이중 전량 조회로 300s 타임아웃 유발하던 경로 제거) */
    let rows;
    let cacheHit;
    let dbMs;
    let degraded = false;
    try {
      const r = await getHeadlinesRowsCached(limit);
      rows = r.rows;
      cacheHit = r.cacheHit;
      dbMs = r.dbMs;
    } catch (err) {
      if (!isPublicReadSoftFailEnabled()) throw err;
      rows = fallbackHeadlinesHero(limit);
      cacheHit = false;
      dbMs = 0;
      degraded = true;
      const fallbackSource = rows.length ? 'last_success_cache' : 'empty';
      logPublicSoftfail('GET /api/home/headlines', err, {
        limit,
        reqId: req.nwRequestId,
        ms: Date.now() - wall0,
        fallbackSource,
      });
    }
    tracePublicFeedPresence(
      'api/home/headlines',
      rows.map((r) => ({ id: r.id, title: r.title })),
      { cache: cacheHit ? 'HIT' : 'MISS', degraded },
    );
    const totalMs = Date.now() - wall0;
    const concurrentSuspicion = !cacheHit && dbMs > 2500;
    const logLine = {
      reqId: req.nwRequestId,
      totalMs,
      dbMs,
      cache: cacheHit ? 'HIT' : 'MISS',
      limit,
      rowCount: rows.length,
      concurrentSuspicion,
      memTtlMs: headlineMemTtlForLog(),
      degraded,
    };
    if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
      logLine.heroIds = rows.map((r) => r && r.id);
    }
    if (totalMs > 1500 || concurrentSuspicion || degraded) {
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
    if (degraded) {
      res.set('X-NW-Degraded', '1');
      res.set('X-NW-Degraded-Reason', NW_DEGRADED_REASON_HEADER);
      res.set('X-NW-Soft-Fail', 'headlines');
    }
    res.set(
      'Access-Control-Expose-Headers',
      'X-NW-Home-Headlines-Ms, X-NW-Headlines-Db-Ms, X-NW-Cache, X-NW-Degraded, X-NW-Degraded-Reason, X-NW-Soft-Fail',
    );
    res.json({
      latestHero: rows,
      _meta: {
        ms: totalMs,
        dbMs,
        cache: cacheHit ? 'HIT' : 'MISS',
        limit,
        rowCount: rows.length,
        degraded,
        softFail: degraded,
        degradedReason: degraded ? NW_DEGRADED_REASON_HEADER : undefined,
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Main bundle: never 500 on latest alone — fallback + partial; popular/ads may be partial on failure. */
homeRouter.get('/', async (req, res, next) => {
  const wall0 = Date.now();
  const sinceMs = Date.now() - POPULAR_DAYS * 24 * 60 * 60 * 1000;

  try {
  const rL = await timeSegment('latest', () => runWithReadDeadline(() => articlesDb.listPublishedForMain()));
  let latestArticles = [];
  let latestDegraded = false;
  try {
    if (rL.ok && Array.isArray(rL.value)) {
      latestArticles = toHomeBundleLatestMin(sanitizeForPublicListPayloadArr(rL.value));
      recordHomeLatestMinSuccess(latestArticles);
    } else {
      throw rL.err || new Error('latest failed');
    }
  } catch (err) {
    latestArticles = fallbackHomeLatestMin();
    latestDegraded = true;
    const fallbackSource = latestArticles.length ? 'last_success_cache' : 'empty';
    logPublicSoftfail('GET /api/home', err, {
      bundle: true,
      reqId: req.nwRequestId,
      ms: rL.ms,
      fallbackSource,
    });
  }

  const readCap = publicReadDeadlineMs();
  const [rP, rA] = await Promise.all([
    (async () => {
      const t0 = Date.now();
      try {
        const pr = await runWithReadDeadline(() => getPopularSinceCached(sinceMs, POPULAR_LIMIT, ''), readCap);
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
    timeSegment('ads', () => runWithReadDeadline(() => loadAdsForHome(), readCap)),
  ]);

  tracePublicFeedPresence(
    'api/home.latestArticles',
    (rL.ok && rL.value ? rL.value : []).map((r) => ({ id: r.id, title: r.title })),
    { cap: mainFeedArticleCap(), len: (rL.value && rL.value.length) || 0, latestDegraded },
  );
  const popularArticles = toHomeBundlePopularMin(
    sanitizeForPublicListPayloadArr(rP.ok && Array.isArray(rP.value) ? rP.value : []),
  );
  const ads = rA.ok && rA.value ? rA.value : buildFallbackAdsConfig();

  const partial = {
    latest: latestDegraded,
    popular: !rP.ok,
    ads: !rA.ok,
    ...(latestDegraded ? { degradedReason: NW_DEGRADED_REASON_HEADER } : {}),
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
  if (!payloadStr || payloadStr === '{}') {
    payloadStr = JSON.stringify({
      latestArticles: [],
      popularArticles: [],
      ads: buildFallbackAdsConfig(),
      _homePartial: { latest: true, popular: true, ads: true, degradedReason: NW_DEGRADED_REASON_HEADER },
    });
  }
  let jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
  if (diagRequested && body._meta) {
    body._meta.jsonBytes = jsonBytes;
    payloadStr = JSON.stringify(body);
    jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
  }

  const partialTags =
    [partial.latest && 'latest', partial.popular && 'popular', partial.ads && 'ads'].filter(Boolean).join(',') || 'none';

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
  res.set('X-NW-Home-Latest-Ok', latestDegraded ? '0' : '1');
  if (latestDegraded) {
    res.set('X-NW-Degraded', '1');
    res.set('X-NW-Degraded-Reason', NW_DEGRADED_REASON_HEADER);
    res.set('X-NW-Soft-Fail', 'home-bundle');
  }
  res.set('X-NW-Home-Popular-Ok', rP.ok ? '1' : '0');
  res.set('X-NW-Home-Ads-Ok', rA.ok ? '1' : '0');
  res.set('X-NW-Home-Popular-Cache', rP.cacheHit ? 'HIT' : 'MISS');
  res.set(
    'Access-Control-Expose-Headers',
    'X-NW-Home-Timing-Wall-Ms, X-NW-Home-Timing-Latest-Ms, X-NW-Home-Timing-Popular-Ms, X-NW-Home-Timing-Ads-Ms, X-NW-Home-Json-Bytes, X-NW-Home-Partial, X-NW-Home-Latest-Ok, X-NW-Home-Popular-Ok, X-NW-Home-Ads-Ok, X-NW-Home-Popular-Cache, X-NW-Degraded, X-NW-Degraded-Reason, X-NW-Soft-Fail',
  );

  function segmentFailTag(err) {
    if (!err) return null;
    return upstreamPrimaryCategory(classifyUpstreamError(err));
  }
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
    degraded: latestDegraded,
    latestUpstreamCategory: rL.ok ? null : segmentFailTag(rL.err),
    popularUpstreamCategory: rP.ok ? null : segmentFailTag(rP.err),
    adsUpstreamCategory: rA.ok ? null : segmentFailTag(rA.err),
  };
  if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
    homeLog.latestIds = (rL.ok && rL.value ? rL.value : []).slice(0, 50).map((x) => x && x.id);
  }
  console.log('[nw/home]', JSON.stringify(homeLog));
  console.info(
    '[nw/home-feed]',
    JSON.stringify({
      route: 'GET /api/home',
      reqId: req.nwRequestId,
      latestLen: latestArticles.length,
      popularLen: popularArticles.length,
      partial,
      ms: wallMs,
    }),
  );

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(payloadStr);
  } catch (e) {
    console.error('[nw/home] bundle unexpected', e && e.message);
    try {
      const partial = {
        latest: true,
        popular: true,
        ads: true,
        degradedReason: NW_DEGRADED_REASON_HEADER,
      };
      const body = {
        latestArticles: fallbackHomeLatestMin(),
        popularArticles: [],
        ads: buildFallbackAdsConfig(),
        _homePartial: partial,
      };
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      res.set('X-NW-Home-Partial', 'latest,popular,ads');
      res.set('X-NW-Home-Latest-Ok', '0');
      res.set('X-NW-Home-Popular-Ok', '0');
      res.set('X-NW-Home-Ads-Ok', '0');
      res.set('X-NW-Degraded', '1');
      res.set('X-NW-Degraded-Reason', NW_DEGRADED_REASON_HEADER);
      res.set('X-NW-Soft-Fail', 'home-bundle-fatal');
      res.status(200);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(JSON.stringify(body));
    } catch (e2) {
      next(e2);
    }
  }
});
