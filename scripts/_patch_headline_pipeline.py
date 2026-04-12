# -*- coding: utf-8 -*-
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
p = ROOT / "script.js"
t = p.read_text(encoding="utf-8")

MARK = "\nfunction nwApplyMainFromHomePayload(payload) {"

if "function nwFetchNetworkHeadlinesWithTimeout" in t:
    print("already patched")
    raise SystemExit(0)

INSERT = r'''

function setLatestTop5FetchErrorState(sec, isTimeout) {
    if (!sec) return;
    nwRemoveHeadlineRetryUi();
    sec.classList.remove('nw-latest-top5--loading');
    sec.classList.add('nw-latest-top5--empty');
    var heroTitle = document.getElementById('nwLatestHeroTitle');
    var heroMeta = document.getElementById('nwLatestHeroMeta');
    var heroImg = document.getElementById('nwLatestHeroImg');
    var heroMedia = document.getElementById('nwLatestHeroMedia');
    var dotsEl = document.getElementById('nwLatestHeroDots');
    var listEl = document.getElementById('nwLatestList');
    if (heroTitle) heroTitle.textContent = '기사를 불러오지 ��했습니다.';
    if (heroMeta) {
        heroMeta.textContent = isTimeout
           ���이 지연되어 중단되었습니다. 다시 시도해 주세요.'
            : '네트워크 상태�� 다시 시도해 주세요.';
    }
    if (heroImg) {
        heroImg.removeAttribute('src');
        heroImg.hidden = true;
    }
    if (heroMedia) heroMedia.classList.add('is-placeholder');
    if (dotsEl) dotsEl.innerHTML = '';
    if (listEl) listEl.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.id = 'nwHeadlineRetryWrap';
    wrap.className = 'nw-headline-retry';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-headline-retry__btn';
    btn.textContent = '다시 시도';
    btn.setAttribute('aria��신 기사 다시 불러오기');
    btn.addEventListener('click', function () {
        nwRetryHeadlinesFromNetwork();
    });
    wrap.appendChild(btn);
    sec.appendChild(wrap);
    if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineSource = 'fallback';
    if (nwHomePerfReportingEnabled()) console.info('[nw-home-perf] headline fallback rendered (error UI)');
}

function nwRetryHeadlinesFromNetwork() {
    nwRemoveHeadlineRetryUi();
    var sec = getNwLatestTop5Section();
    if (sec) {
        sec.classList.remove('nw-latest-top5--empty');
        sec.classList.add('nw-latest-top5--loading');
    }
    var ht = document.getElementById('nwLatestHeroTitle');
    if (ht) ht.textContent = '��러오는 중…';
    var hm = document.getElementById('nwLatestHeroMeta');
    if (hm) hm.textContent = '';
    nwFetchNetworkHeadlinesWithTimeout(false);
}

/** /api/home/headlines 우선, 실패 시 public/latest hero — 각4s timeout, ���고·번들과 무관 */
function nwFetchNetworkHeadlinesWithTimeout(hadCachePaint) {
    if (!nwIsHomeModalPage()) return;
    nwHomePerfEnsureStarted();
    var perf = window.__NW_HOME_PERF__;
    perf.headlineTimeout = false;
    perf.headlineFetchStartMs = Math.round(nwPerfNow());
    if (nwHomePerfReportingEnabled()) {
        console.info('[nw-home-perf] headline fetch started', { hadCachePaint: !!hadCachePaint });
    }
    var primaryUrl = ARTICLES_API + '/api/home/headlines?limit=5';
    var fallbackUrl = ARTICLES_API + '/api/articles/public/latest?limit=5&hero=1';
    var tlim = NW_HEADLINE_FETCH_TIMEOUT_MS;

    function finishFail(lastErr) {
        var aborted = !!(lastErr && lastErr.aborted);
        perf.headlineFetchEndMs = Math.round(nwPerfNow());
        perf.headlineTimeout = !!aborted;
        if (hadCachePaint) {
            perf.headlineSource = 'fallback';
            if (nwHomePerfReportingEnabled()) {
                console.info('[nw-home-perf] headline fallback rendered (kept session cache)', {
                    timeout: !!aborted,
                });
            }
            return;
        }
        if (nwHomePerfReportingEnabled()) {
            if (aborted) console.warn('[nw-home-perf] headline fetch timeout');
            else console.warn('[nw-home-perf] headline fetch error');
        }
        var sec = getNwLatestTop5Section();
        if (sec && !nwLatestTop5AlreadyPopulated()) {
            setLatestTop5FetchErrorState(sec, !!aborted);
        }
    }

    function finishOk(rows, via) {
        if (!Array.isArray(rows) || rows.length === 0) {
            finishFail({ aborted: false });
            return;
        }
        perf.headlineFetchEndMs = Math.round(nwPerfNow());
        perf.headlineTimeout = false;
        perf.headlineSource = 'network';
        perf.headlineHeroFetchMs = Math.round(perf.headlineFetchEndMs - perf.headlineFetchStartMs);
        if (nwHomePerfReportingEnabled()) {
            console.info('[nw-home-perf] headline fetch success', { count: rows.length, via: via });
        }
        nwApplyMainArticlesArray(rows);
    }

    nwFetchJsonWithTimeout(primaryUrl, {}, tlim)
        .then(function (r) {
            if (!r.res.ok) throw new Error('primary http');
            var rows = r.data && r.data.latestHero;
            if (!Array.isArray(rows) || rows.length === 0) throw new Error('primary empty');
            finishOk(rows, 'home/headlines');
        })
        .catch(function () {
            return nwFetchJsonWithTimeout(fallbackUrl, {}, tlim).then(function (r) {
                if (!r.res.ok) throw { aborted: false };
                if (!Array.isArray(r.data) || r.data.length === 0) throw { aborted: false };
                finishOk(r.data, 'articles/public/latest');
            });
        })
        .catch(function (e) {
            finishFail(e && typeof e === 'object' && e.aborted !== undefined ? e : { aborted: false });
        });
}

function nwFetchFullLatestWithTimeout() {
    var url = ARTICLES_API + '/api/articles/public/latest?limit=25';
    var t0 = nwPerfNow();
    nwFetchJsonWithTimeout(url, { headers: { 'Cache-Control': 'no-cache' } }, NW_HEADLINE_FETCH_TIMEOUT_MS)
        .then(function (r) {
            var ms = Math.round(nwPerfNow() - t0);
            if (window.__NW_HOME_PERF__) window.__NW_HOME_PERF__.headlineFullFetchMs = ms;
            if (!r.res.ok) return;
            if (!Array.isArray(r.data)) return;
            nwApplyMainArticlesArray(r.data);
            if (nwHomePerfReportingEnabled()) console.info('[nw-perf] latest full fetch ok', ms, 'status', r.res.status);
        })
        .catch(function () {
            if (nwHomePerfReportingEnabled()) console.warn('[nw-perf] latest full fetch timeout or error');
        });
}

'''

if MARK not in t:
    raise SystemExit("marker not found")

t = t.replace(MARK, INSERT + MARK, 1)

OLD_PAYLOAD = """function nwApplyMainFromHomePayload(payload) {
    if (!payload) return;
    if (payload.ads) {
        applyHeaderAds(payload.ads);
        applySideStacks(payload.ads);
        applyFooterStrip(Array.isArray(payload.ads.footer) ? payload.ads.footer : []);
    }
    nwHomePerfAfterAdsApplied(payload.ads || null);
    nwApplyMainArticlesArray(payload.latestArticles || []);
    nwRenderMostViewedRows(payload.popularArticles);
}"""

NEW_PAYLOAD = """function nwApplyMainFromHomePayload(payload) {
    if (!payload) return;
    nwApplyMainArticlesArray(payload.latestArticles || []);
    if (Array.isArray(payload.popularArticles)) nwRenderMostViewedRows(payload.popularArticles);
    if (payload.ads) {
        applyHeaderAds(payload.ads);
        applySideStacks(payload.ads);
        applyFooterStrip(Array.isArray(payload.ads.footer) ? payload.ads.footer : []);
    }
    nwHomePerfAfterAdsApplied(payload.ads || null);
}"""

if OLD_PAYLOAD not in t:
    raise SystemExit("old payload not found")
t = t.replace(OLD_PAYLOAD, NEW_PAYLOAD, 1)

START = "function nwFetchMainHomeBundle() {"
end_marker = "\n\ndocument.addEventListener('DOMContentLoaded', function () {"
i0 = t.find(START)
i1 = t.find(end_marker)
if i0 < 0 or i1 < 0 or i1 <= i0:
    raise SystemExit("bundle bounds not found")

NEW_BUNDLE = r"""function nwFetchMainHomeBundle() {
    nwHomePerfEnsureStarted();
    var perf = window.__NW_HOME_PERF__;
    var cached = nwReadHomeSessionCache();
    var hasFull = nwSessionCacheHasLatestAndAdsShape(cached);
    var hasLatestOnly = nwSessionCacheHasLatestShape(cached);
    var cacheArticles = hasFull || hasLatestOnly ? (cached && cached.latestArticles) : null;
    var hadCachePaint = !!(cacheArticles && cacheArticles.length);

    if (hadCachePaint) {
        perf.headlineSource = 'cache';
        perf.headlineFetchStartMs = Math.round(nwPerfNow());
        perf.headlineFetchEndMs = Math.round(nwPerfNow());
        perf.headlineTimeout = false;
        if (nwHomePerfReportingEnabled()) console.info('[nw-home-perf] headline cache paint');
        nwApplyMainArticlesArray(cacheArticles);
        if (hasFull) {
            if (Array.isArray(cached.popularArticles)) nwRenderMostViewedRows(cached.popularArticles);
            if (cached.ads) {
                applyHeaderAds(cached.ads);
                applySideStacks(cached.ads);
                applyFooterStrip(Array.isArray(cached.ads.footer) ? cached.ads.footer : []);
                nwMergeAdsIntoHomeSessionCache(cached.ads);
                nwHomePerfAfterAdsApplied(cached.ads);
            }
            if (!hasSideAdData(cached.ads)) nwFetchAdsOnly();
        }
    }

    nwFetchNetworkHeadlinesWithTimeout(hadCachePaint);
    nwFetchFullLatestWithTimeout();

    var adsStart = nwPerfNow();
    fetch(ADS_API + '/api/ads', { credentials: 'omit', cache: 'default' })
        .then(function (res) {
            var ms = Math.round(nwPerfNow() - adsStart);
            if (perf) {
                perf.adsFetchMs = ms;
                perf.adsStatus = res.status;
                try {
                    var cc = res.headers.get('Cache-Control');
                    if (cc) perf.adsCacheControl = cc;
                } catch (eH) {}
            }
            if (nwHomePerfReportingEnabled()) console.info('[nw-perf] ads fetch ms', ms, 'status', res.status);
            if (!res.ok) return Promise.reject(new Error('ads'));
            return res.json();
        })
        .then(function (ads) {
            applyHeaderAds(ads);
            applySideStacks(ads);
            applyFooterStrip(Array.isArray(ads.footer) ? ads.footer : []);
            nwMergeAdsIntoHomeSessionCache(ads);
            nwHomePerfAfterAdsApplied(ads);
        })
        .catch(function () {
            applySideStacks({
                sideLeft: SIDE_ADS.left,
                sideRight: SIDE_ADS.right,
                sideLeftStack: [],
                sideRightStack: [],
            });
            applyFooterStrip(footerAds);
            nwHomePerfAfterAdsApplied(null);
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
                    '<li class="nw-most-viewed-empty">� 기사를 불러오지 ��했습니다.</li>';
            }
        });

    var homeStart = nwPerfNow();
    fetch(ARTICLES_API + '/api/home', {
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'Cache-Control': 'no-cache' },
    })
        .then(function (res) {
            var ms = Math.round(nwPerfNow() - homeStart);
            if (nwHomePerfReportingEnabled()) console.info('[nw-perf] /api/home ms', ms, 'status', res.status);
            if (!res.ok) return Promise.reject(new Error('HTTP ' + res.status));
            return res.text().then(function (txt) {
                try {
                    return txt ? JSON.parse(txt) : null;
                } catch (eJ) {
                    return Promise.reject(new Error('home json'));
                }
            });
        })
        .then(function (payload) {
            if (!payload || typeof payload !== 'object') return Promise.reject(new Error('home payload'));
            nwWriteHomeSessionCache(payload);
            nwApplyMainFromHomePayload(payload);
            if (!hasSideAdData(payload.ads)) nwFetchAdsOnly();
            if (nwHomePerfReportingEnabled()) {
                console.info('[nw-perf] after /api/home bundle ~ms', Math.round(nwPerfNow()));
            }
        })
        .catch(function (err) {
            if (nwHomePerfReportingEnabled()) console.warn('[nw-perf] /api/home failed (non-blocking)', err);
            if (!hasFull) nwFetchAdsOnly();
        });
}
"""

t = t[:i0] + NEW_BUNDLE + t[i1:]
p.write_text(t, encoding="utf-8")
print("patched ok")
