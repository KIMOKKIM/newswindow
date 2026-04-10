import { Router } from 'express';
import { articlesDb } from '../db/articles.js';
import { loadPublicAdsConfig } from './ads.js';
import { mainFeedArticleCap } from '../db/articles.shared.js';

export const homeRouter = Router();

const POPULAR_DAYS = 30;
const POPULAR_LIMIT = 10;

/** 홈에서만 짧은 TTL 캐시(광고). 0이면 비활성. */
const ADS_HOME_CACHE_MS = Math.max(0, Number(process.env.NW_HOME_ADS_CACHE_MS) || 0);
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

async function timeSegment(fn) {
  const t0 = Date.now();
  const value = await fn();
  return { ms: Date.now() - t0, value };
}

/** 메인 첫 화면: 최신 목록 + 인기 + 광고를 한 번에 (네트워크 왕복 최소화) */
homeRouter.get('/', async (req, res, next) => {
  try {
    const sinceMs = Date.now() - POPULAR_DAYS * 24 * 60 * 60 * 1000;
    const wall0 = Date.now();
    const [rL, rP, rA] = await Promise.all([
      timeSegment(() => articlesDb.listPublishedForMain()),
      timeSegment(() => articlesDb.listPublishedPopularSince(sinceMs, POPULAR_LIMIT)),
      timeSegment(() => loadAdsForHome()),
    ]);
    const wallMs = Date.now() - wall0;
    const latestArticles = rL.value;
    const popularArticles = rP.value;
    const ads = rA.value;

    const body = { latestArticles, popularArticles, ads };
    const cap = mainFeedArticleCap();

    const diagRequested =
      String(process.env.NW_HOME_DIAG || '').trim() === '1' &&
      String(req.query.diag || '').trim() === '1';
    if (diagRequested) {
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
      };
    }

    let payloadStr = JSON.stringify(body);
    let jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
    if (diagRequested && body._meta) {
      body._meta.jsonBytes = jsonBytes;
      payloadStr = JSON.stringify(body);
      jsonBytes = Buffer.byteLength(payloadStr, 'utf8');
    }

    res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
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

    if (String(process.env.NW_HOME_TIMING_LOG || '').trim() === '1') {
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
        }),
      );
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(payloadStr);
  } catch (e) {
    next(e);
  }
});
