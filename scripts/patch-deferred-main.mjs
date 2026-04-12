import fs from 'fs';

const p = new URL('../script.js', import.meta.url);
let s = fs.readFileSync(p, 'utf8');

const i = s.indexOf('(1) hero latest');
if (i < 0) {
  console.error('anchor not found');
  process.exit(1);
}
const blockStart = s.lastIndexOf('/**\r\n', i);
if (blockStart < 0) {
  console.error('blockStart not found');
  process.exit(1);
}

const oldBundleStart = s.indexOf('function nwFetchMainHomeBundle() {', i);
const oldBundleEnd = s.indexOf('\r\n}\r\n\r\ndocument.addEventListener', oldBundleStart);
if (oldBundleStart < 0 || oldBundleEnd < 0) {
  console.error('bundle bounds not found', oldBundleStart, oldBundleEnd);
  process.exit(1);
}

const insert = `/**
 * Phase 2: after headlines settle — ads, then staggered article APIs (reduces Supabase contention).
 */
function nwRunDeferredMainLoads(ctx) {
    if (!ctx || ctx.seq !== nwMainBundleSeq) return;
    var hasFull = ctx.hasFull;
    var t0 = ctx.t0;
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

    setTimeout(function () {
        if (ctx.seq !== nwMainBundleSeq) return;
        nwFetchFullLatestWithTimeout();
    }, 100);

    setTimeout(function () {
        if (ctx.seq !== nwMainBundleSeq) return;
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
                        '<li class="nw-most-viewed-empty">' +
                        '\\ub9ce\\uc774 \\ubcf8 \\uae30\\uc0ac\\ub97c \\ubd88\\ub7ec\\uc624\\uc9c0 \\ubabb\\ud588\\uc2b5\\ub2c8\\ub2e4.' +
                        '</li>';
                }
            });
    }, 280);

    setTimeout(function () {
        if (ctx.seq !== nwMainBundleSeq) return;
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
                if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineSource = 'network';
                nwApplyMainFromHomePayload(payload);
                if (!hasSideAdData(payload.ads)) nwFetchAdsOnly();
                var tDone = nwPerfNow() - t0;
                if (nwHomePerfReportingEnabled()) console.info('[nw-perf] after /api/home bundle ~ms', tDone);
            })
            .catch(function (err) {
                if (nwHomePerfReportingEnabled()) console.warn('[nw-perf] /api/home failed (deferred)', err);
                if (!hasFull) nwFetchAdsOnly();
            });
    }, 450);
}

/**
 * Phase 1: headlines only on the network — deferred loads after headline fetch settles.
 */
`;

const newBundle = `function nwFetchMainHomeBundle() {
    nwHomePerfEnsureStarted();
    var seq = ++nwMainBundleSeq;
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
    } else {
        var staleRows = nwReadStaleHeadlineHero();
        if (staleRows && staleRows.length) {
            nwApplyMainArticlesArray(staleRows);
            if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineSource = 'cache';
            hadCachePaint = true;
            if (nwHomePerfReportingEnabled()) {
                console.info('[nw-home-perf] stale headline hero painted from sessionStorage', staleRows.length);
            }
        }
    }

    var ctx = { seq: seq, hasFull: hasFull, t0: t0 };
    nwFetchNetworkHeadlinesWithTimeout(hadCachePaint, function () {
        setTimeout(function () {
            nwRunDeferredMainLoads(ctx);
        }, 0);
    });
}`;

s = s.slice(0, blockStart) + insert + newBundle + s.slice(oldBundleEnd);

fs.writeFileSync(p, s, 'utf8');
console.log('patched deferred main');
