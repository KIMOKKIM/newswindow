import fs from 'fs';

const path = new URL('../script.js', import.meta.url);
let s = fs.readFileSync(path, 'utf8');

const start = s.indexOf('function nwFetchMainHomeBundle()');
const end = s.indexOf('\r\n}\r\n\r\ndocument.addEventListener', start);
if (start < 0 || end < 0) {
  console.error('markers not found', { start, end });
  process.exit(1);
}

const replacement = `function nwFetchMainHomeBundle() {
    nwHomePerfEnsureStarted();
    var t0 = nwPerfNow();
    var cached = nwReadHomeSessionCache();
    var hasFull = nwSessionCacheHasLatestAndAdsShape(cached);
    var hasLatestOnly = nwSessionCacheHasLatestShape(cached);
    var hadCachePaint = false;

    if (hasFull) {
        nwApplyMainArticlesArray(cached.latestArticles);
        if (Array.isArray(cached.popularArticles)) nwRenderMostViewedRows(cached.popularArticles);
        if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineSource = 'cache';
        hadCachePaint = true;
        setTimeout(function () {
            if (cached.ads) {
                applyHeaderAds(cached.ads);
                applySideStacks(cached.ads);
                applyFooterStrip(Array.isArray(cached.ads.footer) ? cached.ads.footer : []);
                nwHomePerfAfterAdsApplied(cached.ads || null);
            }
        }, 0);
        if (!hasSideAdData(cached.ads)) nwFetchAdsOnly();
    } else if (hasLatestOnly) {
        nwApplyMainArticlesArray(cached.latestArticles);
        if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineSource = 'cache';
        hadCachePaint = true;
    }

    nwFetchNetworkHeadlinesWithTimeout(hadCachePaint);
    nwFetchFullLatestWithTimeout();

    var adsStart = nwPerfNow();
    fetch(ADS_API + '/api/ads', { credentials: 'omit', headers: { 'Cache-Control': 'max-age=60' } })
        .then(function (res) {
            var ms = nwPerfNow() - adsStart;
            if (nwMainPerfEnabled()) console.info('[nw-perf] ads fetch ms', ms, 'status', res.status);
            if (!res.ok) return Promise.reject(new Error('ads'));
            return res.json();
        })
        .then(function (ads) {
            applyHeaderAds(ads);
            applySideStacks(ads);
            applyFooterStrip(Array.isArray(ads.footer) ? ads.footer : []);
            nwMergeAdsIntoHomeSessionCache(ads);
        })
        .catch(function () {
            applySideStacks({
                sideLeft: SIDE_ADS.left,
                sideRight: SIDE_ADS.right,
                sideLeftStack: [],
                sideRightStack: [],
            });
            applyFooterStrip(footerAds);
        });

    fetch(ARTICLES_API + '/api/articles/public/popular?days=30&limit=10', { credentials: 'omit' })
        .then(function (res) {
            return res.ok ? res.json() : Promise.reject();
        })
        .then(function (rows) {
            if (Array.isArray(rows)) nwRenderMostViewedRows(rows);
        })
        .catch(function () {
            var mel = document.getElementById('nwMostViewedList');
            if (mel) {
                mel.innerHTML =
                    '<li class="nw-most-viewed-empty">\ub9ce\uc774 \ubcf8 \uae30\uc0ac\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.</li>';
            }
        });

    var homeStart = nwPerfNow();
    fetch(ARTICLES_API + '/api/home', {
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'Cache-Control': 'no-cache' },
    })
        .then(function (res) {
            var ms = nwPerfNow() - homeStart;
            if (nwHomePerfReportingEnabled()) console.info('[nw-perf] /api/home ms', ms, 'status', res.status);
            if (!res.ok) return Promise.reject(new Error('HTTP ' + res.status));
            return res.text().then(function (t) {
                try {
                    return t ? JSON.parse(t) : null;
                } catch (e) {
                    return Promise.reject(new Error('home json'));
                }
            });
        })
        .then(function (payload) {
            if (!payload || typeof payload !== 'object') return Promise.reject(new Error('home payload'));
            nwWriteHomeSessionCache(payload);
            nwApplyMainFromHomePayload(payload);
            if (!hasSideAdData(payload.ads)) nwFetchAdsOnly();
            var tDone = nwPerfNow() - t0;
            if (nwHomePerfReportingEnabled()) console.info('[nw-perf] after /api/home bundle ~ms', tDone);
        })
        .catch(function (err) {
            if (nwHomePerfReportingEnabled())
                console.warn('[nw-perf] /api/home failed (headlines/ads/popular already parallel)', err);
            if (!hasFull) nwFetchAdsOnly();
        });
}`;

const before = s.slice(0, start);
const after = s.slice(end + 7);
s = before + replacement + '\r\n\r\n' + after;
fs.writeFileSync(path, s, 'utf8');
console.log('patched nwFetchMainHomeBundle');
