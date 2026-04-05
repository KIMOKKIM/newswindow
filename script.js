// 뉴스의창 - 인터넷 신문 인터랙션

/**
 * 푸터 바로 위 스폰서/광고 롤링 배너 데이터 (추가·삭제·수정 시 이 배열만 편집)
 * image: 실제 사용 시 예) "/ads/ad1.png" 또는 "./images/partners/xxx.png"
 */
var footerAds = [
    { id: 1, image: '/ads/ad1.png', alt: '전라남도', href: '#' },
    { id: 2, image: '/ads/ad2.png', alt: '경상북도', href: '#' },
    { id: 3, image: '/ads/ad3.png', alt: '경상남도', href: '#' },
    { id: 4, image: '/ads/ad4.png', alt: '충청남도', href: '#' },
    { id: 5, image: '/ads/ad5.png', alt: '충청북도', href: '#' },
    { id: 6, image: '/ads/ad6.png', alt: '제주특별자치도', href: '#' },
    { id: 7, image: '/ads/ad7.png', alt: '세종특별자치시', href: '#' }
];

/** 플레이스홀더 SVG (실제 이미지 없을 때 사용, 교체 시 footerAds[].image만 바꾸면 됨) */
function footerAdPlaceholder(alt) {
    var t = encodeURIComponent(alt || '');
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="40"%3E%3Crect fill="%23eee" width="100" height="40" rx="4"/%3E%3Ctext x="50" y="24" fill="%23999" font-size="11" text-anchor="middle" font-family="sans-serif"%3E' + t + '%3C/text%3E%3C/svg%3E';
}

/**
 * 사이드 광고 이미지 경로·링크 (교체 시 이곳만 수정)
 * 데스크톱에서만 좌/우 세로 배너로 표시됨.
 */
var SIDE_ADS = {
    left: {
        src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="400"%3E%3Crect fill="%23e8e8e8" width="180" height="400"/%3E%3Ctext x="90" y="200" fill="%23999" font-size="14" text-anchor="middle" font-family="sans-serif"%3E좌측 광고%3C/text%3E%3C/svg%3E',
        href: '#'
    },
    right: {
        src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="400"%3E%3Crect fill="%23e8e8e8" width="180" height="400"/%3E%3Ctext x="90" y="200" fill="%23999" font-size="14" text-anchor="middle" font-family="sans-serif"%3E우측 광고%3C/text%3E%3C/svg%3E',
        href: '#'
    }
};

/**
 * 로컬: 백엔드(기사+광고 API)는 3000. 예전 3001 하드코딩은 목록이 비는 원인이 됨.
 * 배포: 동일 출처이면 빈 문자열 → /api/...
 */
/** nw-office·Admin과 동일한 Render API 베이스. Vercel 정적 호스트(www)는 /api 라우트가 없으므로 반드시 백엔드 오리진으로 요청해야 함. */
var NW_PRODUCTION_API_ORIGIN = 'https://newswindow-backend.onrender.com';

var API_ORIGIN = (function () {
    try {
        var h = (location.hostname || '').trim();
        var hl = h.toLowerCase();
        if (!hl) return 'http://127.0.0.1:3000';
        if (hl === 'localhost' || hl === '127.0.0.1' || hl === '::1') return 'http://127.0.0.1:3000';
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hl) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hl)) return 'http://127.0.0.1:3000';
        if (hl === 'www.newswindow.kr' || hl === 'newswindow.kr') return NW_PRODUCTION_API_ORIGIN;
    } catch (e) {}
    return '';
})();
var ADS_API = API_ORIGIN;

/** Vercel 빌드 시 `scripts/vercel-build.mjs`가 주입. 메인(www)과 업로드(백엔드) 호스트가 다를 때 `/uploads/...` 보정용 */
var NW_PUBLIC_UPLOAD_ORIGIN = (function () {
    try {
        if (typeof window === 'undefined' || window.NW_PUBLIC_UPLOAD_ORIGIN == null) return '';
        return String(window.NW_PUBLIC_UPLOAD_ORIGIN).trim().replace(/\/+$/, '');
    } catch (e) {
        return '';
    }
})();

/** Vercel 빌드 시 주입. 프론트(www)와 API(백엔드) 호스트가 다를 때 기사·일부 /api 요청용 */
var NW_CONFIG_API_ORIGIN = (function () {
    try {
        if (typeof window === 'undefined' || window.NW_API_ORIGIN == null) return '';
        return String(window.NW_API_ORIGIN).trim().replace(/\/+$/, '');
    } catch (e) {
        return '';
    }
})();
/** 기사 공개 API base — 프로덕션 도메인은 HTML 주입과 무관하게 광고·기사 동일 Render origin(단일화). */
var ARTICLES_API = (function () {
    try {
        var hl = (location.hostname || '').trim().toLowerCase();
        if (hl === 'www.newswindow.kr' || hl === 'newswindow.kr') return NW_PRODUCTION_API_ORIGIN;
    } catch (e) {}
    return NW_CONFIG_API_ORIGIN || ADS_API;
})();

function nwIsOurSiteHost(hostname) {
    var h = String(hostname || '').toLowerCase();
    return h === 'www.newswindow.kr' || h === 'newswindow.kr' || h === 'localhost' || h === '127.0.0.1';
}

/**
 * 1) `#https://광고주…` → 브라우저가 현재 사이트 해시로만 취급 → `https://광고주…` 로 수정
 * 2) `https://newswindow.kr/#https://광고주…` 처럼 잘못 저장된 전체 주소 → hash 안의 실제 URL 사용
 */
function normalizeAdHref(href) {
    var h = String(href == null ? '#' : href).trim();
    if (!h || h === '#') return '#';
    if (h.charAt(0) === '#') {
        var rest = h.slice(1).trim();
        if (/^https?:\/\//i.test(rest)) return normalizeAdHref(rest);
        if (rest.indexOf('//') === 0) return normalizeAdHref('https:' + rest);
        return h;
    }
    try {
        var u = new URL(h);
        if (nwIsOurSiteHost(u.hostname) && u.hash && u.hash.length > 1) {
            var inner = u.hash.slice(1).trim();
            if (/^https?:\/\//i.test(inner)) return normalizeAdHref(inner);
            if (inner.indexOf('//') === 0) return normalizeAdHref('https:' + inner);
        }
    } catch (e1) {}
    try {
        var origin =
            typeof location !== 'undefined' && location.origin
                ? location.origin
                : 'https://www.newswindow.kr';
        var u2 = new URL(h, origin + '/');
        if (nwIsOurSiteHost(u2.hostname) && u2.hash && u2.hash.length > 1) {
            var inner2 = u2.hash.slice(1).trim();
            if (/^https?:\/\//i.test(inner2)) return normalizeAdHref(inner2);
            if (inner2.indexOf('//') === 0) return normalizeAdHref('https:' + inner2);
        }
    } catch (e2) {}
    return h;
}

/** 광고 JSON의 상대 업로드 경로를 실제 파일 호스트로 붙임 (로컬은 API_ORIGIN, 배포는 NW_PUBLIC_UPLOAD_ORIGIN) */
function resolveAdImageSrc(src) {
    var v = String(src || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.indexOf('data:') === 0) return v;
    if (v.charAt(0) !== '/' || v.indexOf('/uploads/') !== 0) return v;
    var base = (NW_PUBLIC_UPLOAD_ORIGIN || API_ORIGIN || '').replace(/\/+$/, '');
    return base ? base + v : v;
}

/** 로컬 정적 서버가 /article.html?id=… → /article 로 바꾸며 쿼리가 사라지는 경우 대비 */
var PUBLIC_ARTICLE_ID_KEY = 'nw_public_article_id';

function bindPublicArticleLinkStorage() {
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-public-article-id]');
        if (!a) return;
        var id = a.getAttribute('data-public-article-id');
        if (!id) return;
        try {
            sessionStorage.setItem(PUBLIC_ARTICLE_ID_KEY, id);
        } catch (err) {}
    }, true);
}

function publicArticleHref(id) {
    var sid = String(id);
    var enc = encodeURIComponent(sid);
    return '/article.html?id=' + enc + '#id=' + enc;
}

function publicArticleAnchorAttrs(id) {
    var sid = String(id).replace(/"/g, '');
    return ' class="public-article-link" href="' + publicArticleHref(id) + '" data-public-article-id="' + sid + '"';
}

function applyHeaderAds(ads) {
    if (!ads) return;
    var leftImg = document.getElementById('headerAdLeftImg');
    var leftLink = document.getElementById('headerAdLeftLink');
    var rightImg = document.getElementById('headerAdRightImg');
    var rightLink = document.getElementById('headerAdRightLink');
    if (ads.headerLeft && leftImg && leftLink) {
        if (ads.headerLeft.src) leftImg.src = resolveAdImageSrc(ads.headerLeft.src);
        leftLink.href = normalizeAdHref(ads.headerLeft.href || '#');
    }
    if (ads.headerRight && rightImg && rightLink) {
        if (ads.headerRight.src) rightImg.src = resolveAdImageSrc(ads.headerRight.src);
        rightLink.href = normalizeAdHref(ads.headerRight.href || '#');
    }
}

function normalizeSideLeftStack(ads) {
    var stack = [];
    var raw = ads && ads.sideLeftStack;
    var i;
    if (Array.isArray(raw)) {
        for (i = 0; i < 4; i++) stack.push(raw[i] ? { src: raw[i].src || '', href: raw[i].href || '#' } : { src: '', href: '#' });
    } else {
        for (i = 0; i < 4; i++) stack.push({ src: '', href: '#' });
    }
    if (ads && ads.sideLeft && String(ads.sideLeft.src || '').trim() && !String(stack[0].src || '').trim()) {
        stack[0] = { src: ads.sideLeft.src, href: ads.sideLeft.href || '#' };
    }
    return stack;
}

function normalizeSideRightStack(ads) {
    var stack = [];
    var raw = ads && ads.sideRightStack;
    var i;
    if (Array.isArray(raw)) {
        for (i = 0; i < 3; i++) stack.push(raw[i] ? { src: raw[i].src || '', href: raw[i].href || '#' } : { src: '', href: '#' });
    } else {
        for (i = 0; i < 3; i++) stack.push({ src: '', href: '#' });
    }
    if (ads && ads.sideRight && String(ads.sideRight.src || '').trim() && !String(stack[0].src || '').trim()) {
        stack[0] = { src: ads.sideRight.src, href: ads.sideRight.href || '#' };
    }
    return stack;
}

function setSideStackSlot(prefix, index, item) {
    var img = document.getElementById(prefix + '_img' + index);
    var a = document.getElementById(prefix + '_a' + index);
    var card = img ? img.closest('.side-ad-card') : null;
    var ph = card ? card.querySelector('.side-ad-ph') : null;
    var src = item && item.src ? String(item.src).trim() : '';
    var href = item && item.href ? String(item.href).trim() : '#';
    if (a) a.href = normalizeAdHref(href || '#');
    if (!img || !card) return;
    if (src) {
        img.onerror = function () {
            img.hidden = true;
            card.classList.remove('has-ad');
            if (ph) ph.style.display = '';
        };
        img.onload = function () {
            img.hidden = false;
            card.classList.add('has-ad');
            if (ph) ph.style.display = 'none';
        };
        img.src = resolveAdImageSrc(src);
        if (img.complete && img.naturalWidth > 0) {
            img.hidden = false;
            card.classList.add('has-ad');
            if (ph) ph.style.display = 'none';
        }
    } else {
        img.removeAttribute('src');
        img.hidden = true;
        card.classList.remove('has-ad');
        if (ph) ph.style.display = '';
    }
}

function applySideStacks(ads) {
    var left = normalizeSideLeftStack(ads);
    var right = normalizeSideRightStack(ads);
    var j;
    for (j = 0; j < 4; j++) setSideStackSlot('sideAdL', j, left[j]);
    for (j = 0; j < 3; j++) setSideStackSlot('sideAdR', j, right[j]);
}

function applyFooterStrip(list) {
    var track = document.getElementById('footerAdTrack');
    if (!track) return;
    track.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) return;
    // 트랙을 2세트로 붙여서 끝과 시작이 자연스럽게 이어지게 함
    var dup = list.slice().concat(list.slice());
    dup.forEach(function (ad) {
        var div = document.createElement('div');
        div.className = 'footer-ad-item';
        var a = document.createElement('a');
        a.href = normalizeAdHref(ad.href || '#');
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        var img = document.createElement('img');
        img.src =
            ad.image && ad.image.indexOf('data:') !== 0
                ? resolveAdImageSrc(ad.image)
                : footerAdPlaceholder(ad.alt);
        img.alt = ad.alt || '';
        img.onerror = function () { this.src = footerAdPlaceholder(ad.alt); };
        a.appendChild(img);
        div.appendChild(a);
        track.appendChild(div);
    });
}

function toDate(str) {
    if (!str) return '';
    return String(str).slice(0, 10);
}

function cleanBrokenKoreanText(s, fallback) {
    var v = (s == null) ? '' : String(s);
    // 테스트 과정에서 저장된 ??? 형태 데이터 보정
    if (!v) return fallback || '';
    if (/\?{2,}/.test(v)) return fallback || '';
    return v;
}

function parseCreatedAt(str) {
    if (!str) return 0;
    var t = Date.parse(String(str).replace(' ', 'T') + 'Z');
    return isNaN(t) ? 0 : t;
}

function majorCategory(cat) {
    if (!cat) return '';
    return String(cat).split('-')[0].trim();
}

function sortArticleTime(a) {
    if (!a) return 0;
    return parseCreatedAt(a.published_at || a.submitted_at || a.updated_at || a.created_at);
}

function sortByLatest(list) {
    return (Array.isArray(list) ? list.slice() : []).sort(function (a, b) {
        return sortArticleTime(b) - sortArticleTime(a);
    });
}

function renderHeadlineFromPublished(list) {
    var main = document.querySelector('.headline-main');
    var side = document.querySelector('.headline-list');
    if (!main || !side || !Array.isArray(list) || list.length === 0) return;
    var ordered = sortByLatest(list);
    var first = ordered[0];
    var cat = cleanBrokenKoreanText(first.category, '뉴스');
    var title = cleanBrokenKoreanText(first.title, '제목 준비중');
    main.innerHTML = '<a' + publicArticleAnchorAttrs(first.id) + '><h2>' + title + '</h2><p class=\"meta\"><span class=\"category\">' + cat + '</span> | ' + toDate(first.created_at) + '</p></a>';
    var html = '';
    ordered.slice(1, 5).forEach(function (a) {
        html += '<a' + publicArticleAnchorAttrs(a.id) + '>' + cleanBrokenKoreanText(a.title, '제목 준비중') + '</a>';
        html += '<span class=\"meta\">' + cleanBrokenKoreanText(a.category, '뉴스') + ' | ' + toDate(a.created_at) + '</span>';
    });
    if (html) side.innerHTML = html;
}

function renderSectionListsByCategory(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    var groups = {};
    sortByLatest(list).forEach(function (a) {
        var key = majorCategory(a.category);
        if (!key) return;
        // 파이프라인 테스트 등 index 섹션 제목과 일치하지 않는 카테고리는 '이슈' 슬롯에 합류 (DOM section-title과 매칭)
        if (key === 'E2E') key = '이슈';
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
    });
    document.querySelectorAll('.news-section').forEach(function (sec) {
        var t = sec.querySelector('.section-title a');
        var ul = sec.querySelector('.section-list');
        if (!t || !ul) return;
        var sectionName = (t.textContent || '').trim();
        var items = groups[sectionName] || [];
        if (items.length === 0) return;
        var html = '';
        items.slice(0, 4).forEach(function (a, idx) {
            var d = toDate(a.created_at);
            var t = cleanBrokenKoreanText(a.title, '제목 준비중');
            if (idx === 0) html += '<li><a' + publicArticleAnchorAttrs(a.id) + '>' + t + '</a></li>';
            else html += '<li><a' + publicArticleAnchorAttrs(a.id) + '>' + t + '</a><span class=\"date\">' + d + '</span></li>';
        });
        ul.innerHTML = html;
    });
}

function renderTvSectionByCategory(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    var tv = sortByLatest(list).filter(function (a) { return majorCategory(a.category) === '포토뉴스&영상'; });
    if (tv.length === 0) return;
    var wrap = document.querySelector('.tv-list');
    if (!wrap) return;
    wrap.innerHTML = tv.slice(0, 3).map(function (a) {
        return '<article class=\"tv-item\"><a' + publicArticleAnchorAttrs(a.id) + '><div class=\"tv-thumb\"></div><h4>' + cleanBrokenKoreanText(a.title, '제목 준비중') + '</h4></a></article>';
    }).join('');
}

/** 롤링 썸네일: /uploads 상대 경로는 업로드 호스트 접두 */
function resolveArticleListThumb(src) {
    var v = String(src || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.indexOf('data:') === 0) return v;
    if (v.charAt(0) === '/' && v.indexOf('/uploads/') === 0) {
        var base = (NW_PUBLIC_UPLOAD_ORIGIN || NW_CONFIG_API_ORIGIN || ADS_API || '').replace(/\/+$/, '');
        return base ? base + v : v;
    }
    return v;
}

var nwTop5RotatorTimer = null;

/** 운영 index.html이 구버전이면 #nwTop5Rotator가 없어 롤링이 생략됨 → 동일 마크업을 main 앞에 삽입. */
function ensureNwTop5RotatorSection() {
    var sec = document.getElementById('nwTop5Rotator');
    if (sec) return sec;
    var main = document.querySelector('main.main') || document.querySelector('main');
    if (!main) return null;
    sec = document.createElement('section');
    sec.className = 'nw-top5-rotator';
    sec.id = 'nwTop5Rotator';
    sec.style.display = 'none';
    sec.setAttribute('aria-label', '최신 기사');
    sec.innerHTML =
        '<div class="nw-top5-inner">' +
        '<a id="nwTop5Link" class="nw-top5-link" href="#">' +
        '<div class="nw-top5-thumb-wrap">' +
        '<img id="nwTop5Thumb" class="nw-top5-thumb" alt="" width="140" height="94" decoding="async" hidden>' +
        '</div>' +
        '<div class="nw-top5-text">' +
        '<p class="nw-top5-kicker">최신기사</p>' +
        '<h3 id="nwTop5Title" class="nw-top5-title">불러오는 중…</h3>' +
        '<p id="nwTop5Meta" class="nw-top5-submeta"></p>' +
        '</div>' +
        '</a>' +
        '</div>' +
        '<div class="nw-top5-dots" id="nwTop5Dots" aria-hidden="true"></div>';
    main.insertBefore(sec, main.firstChild);
    return sec;
}

function renderTop5RotatorFromList(articles) {
    var sec = ensureNwTop5RotatorSection();
    if (!sec) return;
    if (nwTop5RotatorTimer) {
        clearInterval(nwTop5RotatorTimer);
        nwTop5RotatorTimer = null;
    }
    if (!Array.isArray(articles) || articles.length === 0) {
        sec.style.display = 'none';
        return;
    }
    var ordered = sortByLatest(articles);
    var top5 = ordered.slice(0, 5);
    var linkEl = document.getElementById('nwTop5Link');
    var titleEl = document.getElementById('nwTop5Title');
    var metaEl = document.getElementById('nwTop5Meta');
    var thumbEl = document.getElementById('nwTop5Thumb');
    var dotsEl = document.getElementById('nwTop5Dots');
    if (!linkEl || !titleEl || !metaEl) return;
    sec.style.display = '';

    var idx = 0;
    function show(i) {
        var a = top5[i];
        if (!a) return;
        var href = publicArticleHref(a.id);
        linkEl.setAttribute('href', href);
        titleEl.textContent = cleanBrokenKoreanText(a.title, '제목 준비중');
        var cat = cleanBrokenKoreanText(a.category, '뉴스');
        var by = cleanBrokenKoreanText(a.author_name, '기자');
        var dt = toDate(a.published_at || a.submitted_at || a.created_at);
        metaEl.textContent = cat + ' · ' + by + ' · ' + dt;
        if (thumbEl) {
            var tsrc = resolveArticleListThumb(a.thumb);
            if (tsrc) {
                thumbEl.src = tsrc;
                thumbEl.hidden = false;
            } else {
                thumbEl.removeAttribute('src');
                thumbEl.hidden = true;
            }
        }
        if (dotsEl) {
            dotsEl.innerHTML = top5
                .map(function (_, j) {
                    return '<span class="nw-top5-dot' + (j === i ? ' is-active' : '') + '" aria-hidden="true"></span>';
                })
                .join('');
        }
    }
    show(0);
    if (top5.length > 1) {
        nwTop5RotatorTimer = setInterval(function () {
            idx = (idx + 1) % top5.length;
            show(idx);
        }, 3000);
    } else if (dotsEl) {
        dotsEl.innerHTML = '<span class="nw-top5-dot is-active" aria-hidden="true"></span>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 옛 메인 HTML이 nw-office 로 연결된 경우에도 통합 스태프 SPA 로 이동
    document.querySelectorAll('a[href*="nw-office/index"]').forEach(function (a) {
        a.setAttribute('href', '/admin');
    });

    bindPublicArticleLinkStorage();

    // 광고 설정 API에서 불러와 적용 (실패 시 기본값 사용) — CDN/브라우저 캐시로 구버전 JSON이 남는 것 방지
    fetch(ADS_API + '/api/ads', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (ads) {
            applyHeaderAds(ads);
            applySideStacks(ads);
            applyFooterStrip(ads.footer);
        })
        .catch(function () {
            applySideStacks({
                sideLeft: SIDE_ADS.left,
                sideRight: SIDE_ADS.right,
                sideLeftStack: [],
                sideRightStack: []
            });
            applyFooterStrip(footerAds);
        });

    // 게시·송고 기사 → 메인 헤드라인·섹션·상단 롤링 (동일 API·동일 저장소)
    (function () {
        var pubUrl = ARTICLES_API + '/api/articles/public/list';
        fetch(pubUrl, { cache: 'no-store' })
            .then(function (res) {
                if (/nwdebug=1/.test(location.search)) console.info('[nw-main] public/list', pubUrl, 'status', res.status);
                return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status));
            })
            .then(function (articles) {
                if (!Array.isArray(articles) || articles.length === 0) {
                    renderTop5RotatorFromList([]);
                    return;
                }
                if (/nwdebug=1/.test(location.search)) {
                    var t = articles.filter(function (a) { return a && a.id >= 16 && a.id <= 20; }).map(function (a) { return a.id; });
                    console.info('[nw-main] list count=', articles.length, 'TEST id16-20 in payload=', t);
                }
                renderTop5RotatorFromList(articles);
                renderHeadlineFromPublished(articles);
                renderSectionListsByCategory(articles);
                renderTvSectionByCategory(articles);
                if (/nwdebug=1/.test(location.search)) {
                    var ord = sortByLatest(articles);
                    console.info('[nw-main] headline+side slot ids (top 5)', ord.slice(0, 5).map(function (x) { return x && x.id; }));
                }
            })
            .catch(function (err) {
                renderTop5RotatorFromList([]);
                if (/nwdebug=1/.test(location.search)) console.warn('[nw-main] public/list failed', pubUrl, err);
            });
    })();

    // 모바일 메뉴 토글
    const menuBtn = document.querySelector('.menu-btn');
    const nav = document.querySelector('.nav');

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            nav.classList.toggle('is-open');
            menuBtn.setAttribute('aria-expanded', nav.classList.contains('is-open'));
        });
    }

    // 모바일 하위 메뉴 토글
    document.querySelectorAll('.nav-has-dropdown > a').forEach(function (link) {
        link.addEventListener('click', function (e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                this.parentElement.classList.toggle('is-expanded');
            }
        });
    });

    // 검색 버튼 클릭 (폼 제출은 기본 동작, 필요시 확장)
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            const input = this.querySelector('.search-input');
            if (input && !input.value.trim()) {
                e.preventDefault();
                input.focus();
            }
        });
    }

    // 상단 헤더 날짜 표시 업데이트
    const topHeaderDateEl = document.getElementById('topHeaderDate');
    if (topHeaderDateEl) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const w = weekdays[now.getDay()];
        topHeaderDateEl.textContent = 'UPDATED: ' + y + '-' + m + '-' + d + ' ' + h + ':' + min + ' (' + w + ')';
    }

    // 기존 날짜 표시 업데이트 (.top-banner .date)
    const dateEl = document.querySelector('.top-banner .date');
    if (dateEl) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateEl.textContent = 'UPDATED. ' + now.toLocaleDateString('ko-KR', options);
    }

    // 뉴스 링크/카드 호버 효과
    const hoverTargets = document.querySelectorAll(
        '.headline-main a, .headline-list a, .section-list a, .side-box a, .tv-item a, .focus-item a, .people-item a, .photo-item a'
    );
    hoverTargets.forEach(function (el) {
        el.addEventListener('mouseenter', function () {
            this.style.transition = 'color 0.15s ease';
        });
    });
});
