import { Router } from 'express';
import { articlesDb } from '../db/articles.js';
import { loadPublicAdsConfig, buildFallbackAdsConfig } from './ads.js';
import { mainFeedArticleCap, sanitizeForPublicListPayloadArr } from '../db/articles.shared.js';

export const homeRouter = Router();

const POPULAR_DAYS = 30;
const POPULAR_LIMIT = 10;

/** Home ads cache TTL (ms). Default 60000; NW_HOME_ADS_CACHE_MS=0 disables cache. */
const ADS_HOME_CACHE_MS = (() => {
  const v = process.env.NW_HOME_ADS_CACHE_MS;
  if (v == null || String(v).trim() === '') return 60000;
  return Math.max(0, Number(v) || 0);
})();

let adsHomeCache = { at: 0, data: null };
let lastAdsHomeCacheHit = false;

async function loadAdsForHome() {
  lastAdsHomeCacheHit = false;
  if (ADS_HOME_CACHE_MS > 0 && adsHomeCache.data && Date.now() - adsHomeCache.at < ADS_HOME_CACHE_MS) {
    lastAdsHomeCacheHit = true;
    return adsHomeCache.data;
  }
  const data = await loadPublicAdsConfig();
  if (ADS_HOME_CACHE_MS > 0) {
    adsHomeCache = { at: Date.now(), data };
  }
  return data;
}

async function timeSegment(name, fn) {
  const t0 = Date.now();
  try {
    const value = await fn();
    return { name, ok: true, ms: Date.now() - t0, value, err: null };
  } catch (e) {
    const msg = e && e.message ? String(e.message) : String(e);
    console.error('[nw/home] segment failed', JSON.stringify({ segment: name, ms: Date.now() - t0, error: msg }));
    return { name, ok: false, ms: Date.now() - t0, value: null, err: e };
  }
}

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
      adsHomeCacheHit: lastAdsHomeCacheHit,
      partial,
      popularError: rP.ok ? null : rP.err && rP.err.message,
      adsError: rA.ok ? null : rA.err && rA.err.message,
    }),
  );

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(payloadStr);
});
