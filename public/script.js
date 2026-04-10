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

/** apex·www·서브도메인 공통 — API_ORIGIN 이 빈 문자열이 되면 프론트 호스트로 /api 상대 요청이 나가 404·JSON 파싱 실패로 최신기사 전체가 죽는다 */
function nwIsProductionNewswindowHost(hostname) {
    var hl = (hostname || '').trim().toLowerCase();
    if (!hl) return false;
    return hl === 'newswindow.kr' || hl.slice(-14) === '.newswindow.kr';
}

var API_ORIGIN = (function () {
    try {
        var h = (location.hostname || '').trim();
        var hl = h.toLowerCase();
        if (!hl) return 'http://127.0.0.1:3000';
        if (hl === 'localhost' || hl === '127.0.0.1' || hl === '::1') return 'http://127.0.0.1:3000';
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hl) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hl)) return 'http://127.0.0.1:3000';
        if (nwIsProductionNewswindowHost(hl)) return NW_PRODUCTION_API_ORIGIN;
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
        if (nwIsProductionNewswindowHost(hl)) return NW_PRODUCTION_API_ORIGIN;
    } catch (e) {}
    return NW_CONFIG_API_ORIGIN || ADS_API;
})();

/** shared/articleCategories.json과 동일 매핑 — admin articleMetaFormat.js 와 동기 */
var NW_CATEGORY_VALUE_TO_LABEL = null;

function nwLoadCategoryMap(done) {
    if (NW_CATEGORY_VALUE_TO_LABEL !== null) {
        done();
        return;
    }
    var url;
    try {
        url = new URL('shared/articleCategories.json', window.location.href).href;
    } catch (eUrl) {
        url = 'shared/articleCategories.json';
    }
    fetch(url, { cache: 'force-cache' })
        .then(function (res) {
            return res.ok ? res.json() : Promise.reject();
        })
        .then(function (data) {
            var m = {};
            var gr = data.groups || [];
            var i;
            var j;
            for (i = 0; i < gr.length; i++) {
                var items = gr[i].items || [];
                for (j = 0; j < items.length; j++) {
                    m[items[j].value] = items[j].label;
                }
            }
            var top = data.topLevel || [];
            for (i = 0; i < top.length; i++) {
                m[top[i].value] = top[i].label;
            }
            NW_CATEGORY_VALUE_TO_LABEL = m;
            done();
        })
        .catch(function () {
            NW_CATEGORY_VALUE_TO_LABEL = {};
            done();
        });
}

function nwCategoryLabelForValue(value) {
    var v = value == null ? '' : String(value).trim();
    if (!v) return '';
    if (NW_CATEGORY_VALUE_TO_LABEL && NW_CATEGORY_VALUE_TO_LABEL[v] !== undefined) {
        return NW_CATEGORY_VALUE_TO_LABEL[v];
    }
    return v;
}

/** shared/articleMetaFormat.js reporterDisplayName 과 동일 */
function nwReporterDisplayName(name) {
    var n = name == null ? '' : String(name).trim();
    if (!n) return '기자';
    if (/기자\s*$/.test(n)) return n;
    return n + ' 기자';
}

/** shared/articleMetaFormat.js formatArticleMetaDateYmd 과 동일 */
function nwFormatArticleMetaDateYmd(raw) {
    if (raw == null || String(raw).trim() === '') return '—';
    var s = String(raw).replace(' ', 'T');
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10) || '—';
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + day;
}

function nwIsOurSiteHost(hostname) {
    var h = String(hostname || '').trim().toLowerCase();
    return nwIsProductionNewswindowHost(h) || h === 'localhost' || h === '127.0.0.1';
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

/**
 * 섹션 페이지 URL — 상단 메뉴·본문 섹션 제목·하위 분류 링크 공통
 * (category 값은 shared/articleCategories.json 과 동일해야 함)
 */
function buildSectionHref(category) {
    var c = String(category == null ? '' : category).trim();
    if (!c) return 'section.html';
    return 'section.html?category=' + encodeURIComponent(c);
}

/** index·전체기사·섹션 HTML의 a[data-nw-section] 에 href 주입 */
function nwApplySectionNavHrefs() {
    document.querySelectorAll('a[data-nw-section]').forEach(function (a) {
        var raw = a.getAttribute('data-nw-section');
        if (raw == null || String(raw).trim() === '') return;
        a.setAttribute('href', buildSectionHref(raw));
    });
}

/** 광고 JSON의 상대 업로드 경로를 실제 파일 호스트로 붙임 (로컬은 API_ORIGIN, 배포는 NW_PUBLIC_UPLOAD_ORIGIN) */
function resolveAdImageSrc(src) {
    var v = String(src || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.indexOf('data:') === 0) return v;
    if (v.indexOf('//') === 0) return 'https:' + v;
    if (v.charAt(0) !== '/' || v.indexOf('/uploads/') !== 0) return v;
    var base = (NW_PUBLIC_UPLOAD_ORIGIN || API_ORIGIN || '').replace(/\/+$/, '');
    return base ? base + v : v;
}

/** 광고 배너 GIF 여부 — data URI·http(s) 경로의 확장자·MIME 기준 (애니 GIF는 최적화·async 디코딩 제외) */
function nwAdUrlIsGif(src) {
    var v = String(src || '').trim();
    if (!v) return false;
    if (v.indexOf('data:') === 0) return /^data:image\/gif[\/;]/i.test(v);
    try {
        var pathOnly = v.split('#')[0];
        var q = pathOnly.indexOf('?');
        if (q >= 0) pathOnly = pathOnly.slice(0, q);
        return /\.gif$/i.test(pathOnly);
    } catch (e) {
        return /\.gif$/i.test(v);
    }
}

function nwApplyAdImgEl(img, rawSrc) {
    if (!img) return;
    var resolved = resolveAdImageSrc(String(rawSrc || '').trim());
    if (!resolved) return;
    var isGif = nwAdUrlIsGif(rawSrc) || nwAdUrlIsGif(resolved);
    img.loading = 'eager';
    if (isGif) {
        img.decoding = 'sync';
        img.removeAttribute('fetchpriority');
    } else {
        img.decoding = 'async';
    }
    img.src = resolved;
}

/** 슬롯 객체에서 이미지 URL (src 또는 레거시 image) */
function slotSrcFromRow(row) {
    if (!row || typeof row !== 'object') return '';
    var s = row.src != null ? String(row.src).trim() : '';
    if (s) return s;
    return row.image != null ? String(row.image).trim() : '';
}

/** 좌·우 세로 스택에 표시할 URL이 하나라도 있는지 (캐시에 ads 없을 때 보정용) */
function hasSideAdData(ads) {
    if (!ads || typeof ads !== 'object') return false;
    function slotOk(row) {
        return !!slotSrcFromRow(row);
    }
    var sl = ads.sideLeftStack;
    var sr = ads.sideRightStack;
    if (Array.isArray(sl) && sl.some(slotOk)) return true;
    if (Array.isArray(sr) && sr.some(slotOk)) return true;
    if (slotOk(ads.sideLeft)) return true;
    if (slotOk(ads.sideRight)) return true;
    return false;
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

/** 메인( nw-home )에서는 모달로만 열기 위해 페이지 이동용 URL을 쓰지 않음 — id는 data-public-article-id 로만 전달 */
function publicArticleHref(id) {
    return '#';
}

function publicArticleAnchorAttrs(id) {
    var sid = String(id).replace(/"/g, '');
    return ' class="public-article-link" href="' + publicArticleHref(id) + '" data-public-article-id="' + sid + '"';
}

function nwIsHomeModalPage() {
    try {
        return document.body && document.body.classList.contains('nw-home');
    } catch (e) {
        return false;
    }
}

function nwModalEscHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function nwModalEscAttr(s) {
    return nwModalEscHtml(s).replace(/"/g, '&quot;');
}

function nwModalPara(t) {
    return nwModalEscHtml(t).replace(/\n/g, '</p><p>');
}

function nwModalArticleImageSrc(img) {
    var v = String(img || '').trim();
    if (!v) return '';
    if (v.indexOf('data:') === 0) return v;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.charAt(0) === '/' && v.indexOf('/uploads/') === 0) {
        var base = (NW_PUBLIC_UPLOAD_ORIGIN || NW_CONFIG_API_ORIGIN || ADS_API || '').replace(/\/+$/, '');
        return base ? base + v : v;
    }
    return 'data:image/jpeg;base64,' + v;
}

/** 메인 인라인 상세 패널 — GET /api/articles/public/:id 응답만 사용(더미 없음). 메타 줄은 admin 미리보기와 동일 규칙 */
function nwBuildArticleDetailHtml(a) {
    var mast = [];
    mast.push('<div class="nw-article-detail__masthead">');
    mast.push(
        '<h1 id="nwArticleDetailTitle" class="nw-article-detail__title">' +
            nwModalEscHtml(a.title || '(제목 없음)') +
            '</h1>'
    );
    if (a.subtitle) mast.push('<p class="nw-article-detail__subtitle">' + nwModalEscHtml(a.subtitle) + '</p>');
    var pubRaw = a.published_at && String(a.published_at).trim() ? a.published_at : a.created_at;
    var updRaw = a.updated_at && String(a.updated_at).trim() ? a.updated_at : a.created_at;
    var catShown = nwCategoryLabelForValue(cleanBrokenKoreanText(a.category, '뉴스'));
    if (!catShown) catShown = '—';
    var byline =
        nwReporterDisplayName(a.author_name || '') +
        ' · 발행일 ' +
        nwFormatArticleMetaDateYmd(pubRaw) +
        ' · 수정일 ' +
        nwFormatArticleMetaDateYmd(updRaw);
    mast.push('<p class="nw-article-detail__meta nw-article-detail__meta--preview">');
    mast.push('<span class="nw-article-detail__meta-cat">' + nwModalEscHtml(catShown) + '</span> ');
    mast.push('<span class="nw-article-detail__meta-byline">' + nwModalEscHtml(byline) + '</span>');
    mast.push('</p>');
    mast.push('</div>');
    var scroll = [];
    scroll.push('<div class="nw-article-detail__article-scroll">');
    scroll.push('<div class="nw-article-detail__article-body">');
    function block(img, cap, content) {
        if (content) scroll.push('<p>' + nwModalPara(content) + '</p>');
        if (img) {
            var src = nwModalArticleImageSrc(img);
            if (src) scroll.push('<img class="nw-article-detail__img" src="' + nwModalEscAttr(src) + '" alt="">');
        }
        if (cap) scroll.push('<p class="nw-article-detail__cap">' + nwModalEscHtml(cap) + '</p>');
    }
    block(a.image1, a.image1_caption, a.content1);
    block(a.image2, a.image2_caption, a.content2);
    block(a.image3, a.image3_caption, a.content3);
    block(a.image4, a.image4_caption, a.content4);
    if (!a.content1 && !a.content2 && !a.content3 && !a.content4 && a.content) {
        scroll.push('<p>' + nwModalPara(a.content) + '</p>');
    }
    scroll.push('</div>');
    scroll.push('<p class="nw-article-detail__legal">저작권자 © 뉴스의창 무단전재 및 재배포 금지</p>');
    scroll.push('</div>');
    return mast.join('') + scroll.join('');
}

function nwArticleDetailOnKeydown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        nwCloseArticleDetail();
    }
}

function nwCloseArticleDetail() {
    var shell = document.getElementById('nwArticleDetail');
    if (!shell) return;
    shell.hidden = true;
    shell.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', nwArticleDetailOnKeydown);
}

function nwSyncLatestTop5UiIfInTop5(articleId) {
    var j = nwLatestTop5Sync.indexOfId(articleId);
    if (j >= 0) nwLatestTop5Sync.goTo(j);
}

function nwOpenArticleDetail(articleId) {
    if (!nwIsHomeModalPage()) return;
    var shell = document.getElementById('nwArticleDetail');
    var innerEl = document.getElementById('nwArticleDetailBody');
    if (!shell || !innerEl) return;
    var idTrim = String(articleId).trim();
    nwSyncLatestTop5UiIfInTop5(idTrim);
    var url = ARTICLES_API + '/api/articles/public/' + encodeURIComponent(idTrim);
    innerEl.className = 'nw-article-detail__inner nw-article-detail__inner--plain';
    innerEl.innerHTML = '<p class="nw-article-detail__loading" role="status">기사를 불러오는 중…</p>';
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    document.removeEventListener('keydown', nwArticleDetailOnKeydown);
    document.addEventListener('keydown', nwArticleDetailOnKeydown);
    try {
        shell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (eScroll) {}
    fetch(url, { cache: 'no-store' })
        .then(function (res) {
            return res.json().then(function (data) {
                if (!res.ok) throw new Error((data && data.error) || '기사를 불러오지 못했습니다.');
                return data;
            });
        })
        .then(function (a) {
            innerEl.className = 'nw-article-detail__inner';
            innerEl.innerHTML = nwBuildArticleDetailHtml(a);
        })
        .catch(function (err) {
            innerEl.className = 'nw-article-detail__inner nw-article-detail__inner--plain';
            innerEl.innerHTML =
                '<p class="nw-article-detail__error" role="alert">기사 로드 실패</p><p class="nw-article-detail__errmsg">' +
                nwModalEscHtml(err.message || '오류') +
                '</p>';
        });
}

function nwBindMainArticleDetail() {
    if (!nwIsHomeModalPage()) return;
    var shell = document.getElementById('nwArticleDetail');
    if (!shell) return;
    var btnClose = shell.querySelector('[data-nw-article-detail-close]');
    if (btnClose) btnClose.addEventListener('click', nwCloseArticleDetail);
    document.addEventListener(
        'click',
        function (e) {
            if (!nwIsHomeModalPage()) return;
            var a = e.target.closest && e.target.closest('a.public-article-link');
            if (!a) return;
            var id = a.getAttribute('data-public-article-id');
            if (id == null || String(id).trim() === '') return;
            e.preventDefault();
            nwOpenArticleDetail(String(id).trim());
        },
        true
    );
}

function applyHeaderAds(ads) {
    if (!ads) return;
    var leftImg = document.getElementById('headerAdLeftImg');
    var leftLink = document.getElementById('headerAdLeftLink');
    var rightImg = document.getElementById('headerAdRightImg');
    var rightLink = document.getElementById('headerAdRightLink');
    if (ads.headerLeft && leftImg && leftLink) {
        if (ads.headerLeft.src) nwApplyAdImgEl(leftImg, ads.headerLeft.src);
        leftLink.href = normalizeAdHref(ads.headerLeft.href || '#');
    }
    if (ads.headerRight && rightImg && rightLink) {
        if (ads.headerRight.src) nwApplyAdImgEl(rightImg, ads.headerRight.src);
        rightLink.href = normalizeAdHref(ads.headerRight.href || '#');
    }
}

function normalizeSideLeftStack(ads) {
    var stack = [];
    var raw = ads && ads.sideLeftStack;
    var i;
    if (Array.isArray(raw)) {
        for (i = 0; i < 4; i++) {
            var rowL = raw[i];
            stack.push(
                rowL
                    ? { src: slotSrcFromRow(rowL), href: rowL.href || '#' }
                    : { src: '', href: '#' }
            );
        }
    } else {
        for (i = 0; i < 4; i++) stack.push({ src: '', href: '#' });
    }
    if (ads && ads.sideLeft && String(slotSrcFromRow(ads.sideLeft) || '').trim() && !String(stack[0].src || '').trim()) {
        stack[0] = { src: slotSrcFromRow(ads.sideLeft), href: ads.sideLeft.href || '#' };
    }
    return stack;
}

function normalizeSideRightStack(ads) {
    var stack = [];
    var raw = ads && ads.sideRightStack;
    var i;
    if (Array.isArray(raw)) {
        for (i = 0; i < 3; i++) {
            var rowR = raw[i];
            stack.push(
                rowR
                    ? { src: slotSrcFromRow(rowR), href: rowR.href || '#' }
                    : { src: '', href: '#' }
            );
        }
    } else {
        for (i = 0; i < 3; i++) stack.push({ src: '', href: '#' });
    }
    if (ads && ads.sideRight && String(slotSrcFromRow(ads.sideRight) || '').trim() && !String(stack[0].src || '').trim()) {
        stack[0] = { src: slotSrcFromRow(ads.sideRight), href: ads.sideRight.href || '#' };
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
        var resolved = resolveAdImageSrc(src);
        var isGif = nwAdUrlIsGif(src) || nwAdUrlIsGif(resolved);
        /* lazy + [hidden]/display:none 이면 페치가 지연·생략되어 onload가 안 날 수 있음 — 사이드 슬롯은 즉시 로드 */
        img.loading = 'eager';
        img.decoding = isGif ? 'sync' : 'async';
        img.onerror = function () {
            img.hidden = true;
            card.classList.remove('has-ad');
            if (ph) ph.style.display = '';
        };
        function revealSlot() {
            if (card.classList.contains('has-ad')) return;
            img.removeAttribute('hidden');
            img.hidden = false;
            card.classList.add('has-ad');
            if (ph) ph.style.display = 'none';
            if (isGif) {
                requestAnimationFrame(function () {
                    var u = img.src;
                    img.src = '';
                    img.src = u;
                });
            }
        }
        img.onload = function () {
            revealSlot();
        };
        img.src = resolved;
        if (img.complete && img.naturalWidth > 0) {
            revealSlot();
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

/** 푸터 롤링: href + 이미지 URL + alt 기준 중복 제거 (DB/API 원본만 넘길 것) */
function dedupeFooterAds(list) {
    var seen = {};
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (raw) {
        if (!raw || typeof raw !== 'object') return;
        var href = String(raw.href != null ? raw.href : '#').trim();
        var imageUrl = String(raw.image != null ? raw.image : raw.src != null ? raw.src : '').trim();
        var alt = String(raw.alt != null ? raw.alt : '').trim();
        var key = href + '\0' + imageUrl + '\0' + alt;
        if (seen[key]) return;
        seen[key] = true;
        out.push({ href: href || '#', image: imageUrl, alt: alt });
    });
    return out;
}

var __nwFooterMarqueeResizeT = null;
function nwUpdateFooterMarqueeShift(track) {
    if (!track || !track.classList.contains('footer-ad-track--marquee')) return;
    var first = track.querySelector('.footer-ad-set');
    if (!first) return;
    var w = Math.round(first.getBoundingClientRect().width);
    track.style.setProperty('--footer-marquee-shift', w ? '-' + w + 'px' : '-50%');
}

function nwBindFooterMarqueeResizeOnce() {
    if (window.__nwFooterMarqueeResizeBound) return;
    window.__nwFooterMarqueeResizeBound = true;
    window.addEventListener(
        'resize',
        function () {
            clearTimeout(__nwFooterMarqueeResizeT);
            __nwFooterMarqueeResizeT = setTimeout(function () {
                nwUpdateFooterMarqueeShift(document.getElementById('footerAdTrack'));
            }, 150);
        },
        { passive: true }
    );
}

function applyFooterStrip(list) {
    var track = document.getElementById('footerAdTrack');
    if (!track) return;
    track.innerHTML = '';
    track.classList.remove('footer-ad-track--static', 'footer-ad-track--marquee');
    track.style.removeProperty('--footer-marquee-shift');

    var rawList = Array.isArray(list) ? list : [];
    if (rawList.length === 0) return;

    var unique = dedupeFooterAds(rawList);
    if (unique.length === 0) return;

    function makeItem(ad, itemIdx, setIdx) {
        var div = document.createElement('div');
        div.className = 'footer-ad-item';
        div.setAttribute('data-footer-key', [ad.href, ad.alt, ad.image || '', setIdx, itemIdx].join('|'));
        var a = document.createElement('a');
        a.href = normalizeAdHref(ad.href || '#');
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        var img = document.createElement('img');
        var srcRaw = ad.image && String(ad.image).indexOf('data:') !== 0 ? ad.image : '';
        if (srcRaw) {
            var r = resolveAdImageSrc(String(srcRaw).trim());
            img.loading = 'eager';
            img.decoding = nwAdUrlIsGif(srcRaw) || nwAdUrlIsGif(r) ? 'sync' : 'async';
            img.src = r;
        } else {
            img.src = footerAdPlaceholder(ad.alt);
        }
        img.alt = ad.alt || '';
        img.onerror = function () { this.src = footerAdPlaceholder(ad.alt); };
        a.appendChild(img);
        div.appendChild(a);
        return div;
    }

    function appendSet(setIdx) {
        var set = document.createElement('div');
        set.className = 'footer-ad-set';
        set.setAttribute('data-footer-set', String(setIdx));
        unique.forEach(function (ad, i) {
            set.appendChild(makeItem(ad, i, setIdx));
        });
        track.appendChild(set);
    }

    if (unique.length < 2) {
        track.classList.add('footer-ad-track--static');
        track.appendChild(makeItem(unique[0], 0, 0));
        console.log('[footer-roll] dbItems(unique)=' + unique.length + ' renderItems=1 sets=1 mode=static');
        return;
    }

    appendSet(0);
    appendSet(1);
    track.classList.add('footer-ad-track--marquee');
    nwBindFooterMarqueeResizeOnce();

    console.log(
        '[footer-roll] dbItems(unique)=' + unique.length +
            ' renderSets=2 itemsPerSet=' + unique.length +
            ' totalDomItems=' + (unique.length * 2) +
            ' mode=marquee',
    );

    nwUpdateFooterMarqueeShift(track);
    requestAnimationFrame(function () {
        nwUpdateFooterMarqueeShift(track);
    });
    var firstSetEl = track.querySelector('.footer-ad-set');
    if (firstSetEl) {
        firstSetEl.querySelectorAll('img').forEach(function (im) {
            if (im.complete) return;
            im.addEventListener(
                'load',
                function () {
                    nwUpdateFooterMarqueeShift(track);
                },
                { once: true }
            );
        });
    }
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

/** 메인 전역 카테고리 표시(??? 보정 후 articleCategories 매핑 — 원본 필드 비변경) */
function displayCategory(raw) {
    return nwCategoryLabelForValue(cleanBrokenKoreanText(raw, '뉴스'));
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
    var cat = displayCategory(first.category);
    var title = cleanBrokenKoreanText(first.title, '제목 준비중');
    main.innerHTML = '<a' + publicArticleAnchorAttrs(first.id) + '><h2>' + title + '</h2><p class=\"meta\"><span class=\"category\">' + cat + '</span> | ' + toDate(first.created_at) + '</p></a>';
    var html = '';
    ordered.slice(1, 5).forEach(function (a) {
        html += '<a' + publicArticleAnchorAttrs(a.id) + '>' + cleanBrokenKoreanText(a.title, '제목 준비중') + '</a>';
        html += '<span class=\"meta\">' + displayCategory(a.category) + ' | ' + toDate(a.created_at) + '</span>';
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

var nwLatestTop5Timer = null;

/** 최신기사 Top5: 클릭 시 리스트/히어로 active만 동기화(show). 상세는 nwOpenArticleDetail에서 fetch */
var nwLatestTop5Sync = {
    goTo: function () {},
    indexOfId: function () {
        return -1;
    }
};

/** index.html에 #nwLatestTop5 가 있어야 함 — DOM 삽입하지 않고 데이터만 바인딩 */
function getNwLatestTop5Section() {
    return document.getElementById('nwLatestTop5');
}

function setLatestTop5EmptyState(sec, titleText, metaText) {
    if (!sec) return;
    sec.classList.remove('nw-latest-top5--loading');
    sec.classList.add('nw-latest-top5--empty');
    var heroTitle = document.getElementById('nwLatestHeroTitle');
    var heroMeta = document.getElementById('nwLatestHeroMeta');
    var heroImg = document.getElementById('nwLatestHeroImg');
    var heroMedia = document.getElementById('nwLatestHeroMedia');
    var dotsEl = document.getElementById('nwLatestHeroDots');
    var listEl = document.getElementById('nwLatestList');
    if (heroTitle) heroTitle.textContent = titleText || '';
    if (heroMeta) heroMeta.textContent = metaText || '';
    if (heroImg) {
        heroImg.removeAttribute('src');
        heroImg.hidden = true;
    }
    if (heroMedia) heroMedia.classList.add('is-placeholder');
    if (dotsEl) dotsEl.innerHTML = '';
    if (listEl) listEl.innerHTML = '';
}

/**
 * 공개 기사 목록에서 최신순 최대 5건 — 좌측 히어로 3초 롤링·우측 고정 리스트·active 동기화
 */
function renderLatestTop5FromList(articles) {
    var sec = getNwLatestTop5Section();
    if (!sec) return;
    nwLatestTop5Sync.goTo = function () {};
    nwLatestTop5Sync.indexOfId = function () {
        return -1;
    };
    if (nwLatestTop5Timer) {
        clearInterval(nwLatestTop5Timer);
        nwLatestTop5Timer = null;
    }
    try {
    if (!Array.isArray(articles) || articles.length === 0) {
        setLatestTop5EmptyState(
            sec,
            '등록된 공개 기사가 없습니다.',
            '게시·송고된 기사가 있으면 여기에 표시됩니다.'
        );
        return;
    }
    sec.classList.remove('nw-latest-top5--loading', 'nw-latest-top5--empty');

    var ordered = sortByLatest(articles);
    var top5 = ordered.slice(0, 5);
    var heroLink = document.getElementById('nwLatestHeroLink');
    var heroTitle = document.getElementById('nwLatestHeroTitle');
    var heroMeta = document.getElementById('nwLatestHeroMeta');
    var heroImg = document.getElementById('nwLatestHeroImg');
    var heroMedia = document.getElementById('nwLatestHeroMedia');
    var dotsEl = document.getElementById('nwLatestHeroDots');
    var listEl = document.getElementById('nwLatestList');
    if (!heroLink || !heroTitle || !heroMeta || !listEl) return;

    listEl.innerHTML = '';

    top5.forEach(function (row, i) {
        var cat = displayCategory(row.category);
        var dt = toDate(row.published_at || row.submitted_at || row.created_at);
        var li = document.createElement('li');
        li.className = 'nw-latest-list__item';
        li.setAttribute('data-idx', String(i));
        var sid = String(row.id).replace(/"/g, '');
        var al = document.createElement('a');
        al.className = 'public-article-link nw-latest-list__link';
        al.href = publicArticleHref(row.id);
        al.setAttribute('data-public-article-id', sid);
        al.textContent = cleanBrokenKoreanText(row.title, '제목 준비중');
        var sm = document.createElement('span');
        sm.className = 'nw-latest-list__item-meta';
        sm.textContent = cat + ' · ' + dt;
        li.appendChild(al);
        li.appendChild(sm);
        listEl.appendChild(li);
    });

    var idx = 0;
    function applyHeroThumb(row) {
        if (!heroImg || !heroMedia) return;
        var tsrc = resolveArticleListThumb(row.thumb);
        if (tsrc) {
            heroMedia.classList.remove('is-placeholder');
            heroImg.onerror = function () {
                heroImg.hidden = true;
                heroMedia.classList.add('is-placeholder');
            };
            heroImg.onload = function () {
                heroImg.hidden = false;
                heroMedia.classList.remove('is-placeholder');
            };
            heroImg.src = tsrc;
            if (heroImg.complete && heroImg.naturalWidth > 0) {
                heroImg.hidden = false;
                heroMedia.classList.remove('is-placeholder');
            }
        } else {
            heroImg.removeAttribute('src');
            heroImg.hidden = true;
            heroMedia.classList.add('is-placeholder');
        }
    }

    function show(i) {
        var row = top5[i];
        if (!row) return;
        var href = publicArticleHref(row.id);
        heroLink.setAttribute('href', href);
        heroLink.setAttribute('data-public-article-id', String(row.id));
        heroLink.classList.add('public-article-link');
        heroTitle.textContent = cleanBrokenKoreanText(row.title, '제목 준비중');
        var cat = displayCategory(row.category);
        var by = cleanBrokenKoreanText(row.author_name, '기자');
        var dt = toDate(row.published_at || row.submitted_at || row.created_at);
        heroMeta.textContent = cat + ' · ' + by + ' · ' + dt;
        applyHeroThumb(row);

        if (dotsEl) {
            dotsEl.innerHTML = top5
                .map(function (_, j) {
                    return '<span class="nw-latest-hero__dot' + (j === i ? ' is-active' : '') + '" aria-hidden="true"></span>';
                })
                .join('');
        }

        listEl.querySelectorAll('.nw-latest-list__item').forEach(function (li, j) {
            li.classList.toggle('is-active', j === i);
        });
    }

    show(0);
    if (top5.length > 1) {
        nwLatestTop5Timer = setInterval(function () {
            idx = (idx + 1) % top5.length;
            show(idx);
        }, 3000);
    } else if (dotsEl) {
        dotsEl.innerHTML = '<span class="nw-latest-hero__dot is-active" aria-hidden="true"></span>';
    }

    nwLatestTop5Sync.goTo = function (i) {
        if (i < 0 || i >= top5.length) return;
        idx = i;
        show(i);
    };
    nwLatestTop5Sync.indexOfId = function (id) {
        var s = String(id);
        for (var j = 0; j < top5.length; j++) {
            if (String(top5[j].id) === s) return j;
        }
        return -1;
    };
    } catch (e) {
        if (nwLatestTop5Timer) {
            clearInterval(nwLatestTop5Timer);
            nwLatestTop5Timer = null;
        }
        setLatestTop5EmptyState(
            sec,
            '최신 기사를 표시하는 중 오류가 났습니다.',
            '페이지를 새로 고치거나 잠시 후 다시 시도해 주세요.'
        );
        if (/nwdebug=1/.test(location.search)) console.warn('[nw-main] renderLatestTop5FromList', e);
    }
}

/** Next.js 가 아님: 탭 복귀/승인 시 storage 로 메인 번들 재요청 */
var NW_MAIN_LIST_LAST_FETCH_AT = 0;
function nwThrottleFetchMainPublicList() {
    var now = Date.now();
    if (now - NW_MAIN_LIST_LAST_FETCH_AT < 1200) return;
    NW_MAIN_LIST_LAST_FETCH_AT = now;
    nwFetchMainHomeBundle();
}

var NW_HOME_SESSION_KEY = 'nw_home_bundle_v1';

function nwReadHomeSessionCache() {
    try {
        var raw = sessionStorage.getItem(NW_HOME_SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function nwWriteHomeSessionCache(payload) {
    try {
        sessionStorage.setItem(
            NW_HOME_SESSION_KEY,
            JSON.stringify({
                at: Date.now(),
                latestArticles: payload.latestArticles,
                popularArticles: payload.popularArticles,
                ads: payload.ads,
            }),
        );
    } catch (e) {}
}

function nwMergeAdsIntoHomeSessionCache(ads) {
    if (!ads) return;
    try {
        var raw = sessionStorage.getItem(NW_HOME_SESSION_KEY);
        if (!raw) return;
        var c = JSON.parse(raw);
        if (!c || typeof c !== 'object') return;
        c.ads = ads;
        c.at = Date.now();
        sessionStorage.setItem(NW_HOME_SESSION_KEY, JSON.stringify(c));
    } catch (e) {}
}

function nwRenderMostViewedRows(rows) {
    var el = document.getElementById('nwMostViewedList');
    if (!el) return;
    if (!Array.isArray(rows) || rows.length === 0) {
        el.innerHTML = '<li class="nw-most-viewed-empty">최근 30일 내 표시할 기사가 없습니다.</li>';
        return;
    }
    var html = '';
    var i;
    for (i = 0; i < rows.length; i++) {
        var a = rows[i];
        if (!a || a.id == null) continue;
        var t = cleanBrokenKoreanText(a.title, '제목 준비중');
        html += '<li><a' + publicArticleAnchorAttrs(a.id) + '>' + t + '</a></li>';
    }
    el.innerHTML =
        html || '<li class="nw-most-viewed-empty">최근 30일 내 표시할 기사가 없습니다.</li>';
}

function nwApplyMainArticlesArray(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
        renderLatestTop5FromList([]);
        return;
    }
    articles = articles.filter(function (a) {
        if (!a) return false;
        var s = String(a.status || '').toLowerCase();
        return s === 'published' || s === 'approved';
    });
    if (articles.length === 0) {
        renderLatestTop5FromList([]);
        return;
    }
    if (/nwdebug=1/.test(location.search)) {
        var t = articles.filter(function (a) { return a && a.id >= 16 && a.id <= 20; }).map(function (a) { return a.id; });
        console.info('[nw-main] list count=', articles.length, 'TEST id16-20 in payload=', t);
    }
    renderLatestTop5FromList(articles);
    requestAnimationFrame(function () {
        try {
            renderSectionListsByCategory(articles);
            renderTvSectionByCategory(articles);
        } catch (secErr) {
            if (/nwdebug=1/.test(location.search)) console.warn('[nw-main] section/tv render', secErr);
        }
    });
    if (/nwdebug=1/.test(location.search)) {
        var ord = sortByLatest(articles);
        console.info('[nw-main] latest top5 ids', ord.slice(0, 5).map(function (x) { return x && x.id; }));
    }
}

function nwApplyMainFromHomePayload(payload) {
    if (!payload) return;
    if (payload.ads) {
        applyHeaderAds(payload.ads);
        applySideStacks(payload.ads);
        applyFooterStrip(Array.isArray(payload.ads.footer) ? payload.ads.footer : []);
    }
    nwApplyMainArticlesArray(payload.latestArticles || []);
    nwRenderMostViewedRows(payload.popularArticles);
}

function nwFetchMainLegacyHomeParallel() {
    var listUrl = ARTICLES_API + '/api/articles/public/list';
    var popUrl = ARTICLES_API + '/api/articles/public/popular?days=30&limit=10';
    var opts = { cache: 'no-store', credentials: 'omit', headers: { 'Cache-Control': 'no-cache' } };
    Promise.allSettled([
        fetch(ADS_API + '/api/ads', opts).then(function (res) {
            return res.ok ? res.json() : Promise.reject(new Error('ads'));
        }),
        fetch(listUrl, opts).then(function (res) {
            return res.ok ? res.json() : Promise.reject(new Error('list'));
        }),
        fetch(popUrl, opts).then(function (res) {
            return res.ok ? res.json() : Promise.reject(new Error('popular'));
        }),
    ]).then(function (results) {
        if (results[0].status === 'fulfilled') {
            var ads = results[0].value;
            applyHeaderAds(ads);
            applySideStacks(ads);
            applyFooterStrip(Array.isArray(ads.footer) ? ads.footer : []);
        } else {
            applySideStacks({
                sideLeft: SIDE_ADS.left,
                sideRight: SIDE_ADS.right,
                sideLeftStack: [],
                sideRightStack: [],
            });
            applyFooterStrip(footerAds);
        }
        if (results[1].status === 'fulfilled') {
            nwApplyMainArticlesArray(results[1].value);
        } else {
            var s = getNwLatestTop5Section();
            if (s) {
                if (nwLatestTop5Timer) {
                    clearInterval(nwLatestTop5Timer);
                    nwLatestTop5Timer = null;
                }
                setLatestTop5EmptyState(
                    s,
                    '기사 목록을 불러오지 못했습니다.',
                    '네트워크 또는 서버 응답을 확인해 주세요.'
                );
            }
        }
        if (results[2].status === 'fulfilled') {
            nwRenderMostViewedRows(results[2].value);
        } else {
            var mel = document.getElementById('nwMostViewedList');
            if (mel) {
                mel.innerHTML =
                    '<li class="nw-most-viewed-empty">많이 본 기사를 불러오지 못했습니다.</li>';
            }
        }
    });
}

/** 좌·우 사이드 등 광고만 갱신 (/api/home 실패·캐시에 ads 없음 등 보정) */
function nwFetchAdsOnly() {
    var opts = { cache: 'no-store', credentials: 'omit', headers: { 'Cache-Control': 'no-cache' } };
    fetch(ADS_API + '/api/ads', opts)
        .then(function (res) {
            return res.ok ? res.json() : Promise.reject(new Error('ads'));
        })
        .then(function (ads) {
            applyHeaderAds(ads);
            applySideStacks(ads);
            applyFooterStrip(Array.isArray(ads.footer) ? ads.footer : []);
            nwMergeAdsIntoHomeSessionCache(ads);
        })
        .catch(function () {});
}

/** 메인: GET /api/home 한 번에 최신+인기+광고 (실패 시 병렬 레거시). 세션 캐시로 재방문 시 즉시 표시 후 재검증 */
function nwFetchMainHomeBundle() {
    var homeUrl = ARTICLES_API + '/api/home';
    var cached = nwReadHomeSessionCache();
    if (cached && Array.isArray(cached.latestArticles)) {
        nwApplyMainFromHomePayload({
            latestArticles: cached.latestArticles,
            popularArticles: cached.popularArticles,
            ads: cached.ads,
        });
        if (!hasSideAdData(cached.ads)) {
            nwFetchAdsOnly();
        }
    }
    fetch(homeUrl, {
        cache: 'no-store',
        credentials: 'omit',
        headers: { 'Cache-Control': 'no-cache' },
    })
        .then(function (res) {
            if (/nwdebug=1/.test(location.search)) console.info('[nw-main] /api/home', homeUrl, 'status', res.status);
            return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status));
        })
        .then(function (payload) {
            nwWriteHomeSessionCache(payload);
            nwApplyMainFromHomePayload(payload);
            if (!hasSideAdData(payload.ads)) {
                nwFetchAdsOnly();
            }
        })
        .catch(function (err) {
            if (/nwdebug=1/.test(location.search)) console.warn('[nw-main] /api/home failed', err);
            if (!cached || !Array.isArray(cached.latestArticles)) {
                nwFetchMainLegacyHomeParallel();
            } else {
                nwFetchAdsOnly();
            }
        });
}

document.addEventListener('DOMContentLoaded', function () {
    nwLoadCategoryMap(function () {});
    // 옛 메인 HTML이 nw-office 로 연결된 경우에도 통합 스태프 SPA 로 이동
    document.querySelectorAll('a[href*="nw-office/index"]').forEach(function (a) {
        a.setAttribute('href', '/admin');
    });

    bindPublicArticleLinkStorage();
    nwBindMainArticleDetail();

    // 메인 데이터: /api/home (최신+인기+광고 1회) → 실패 시 레거시 병렬 요청
    nwFetchMainHomeBundle();
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') nwThrottleFetchMainPublicList();
    });
    window.addEventListener('focus', nwThrottleFetchMainPublicList);
    window.addEventListener('pageshow', function (ev) {
        if (ev.persisted) nwThrottleFetchMainPublicList();
    });
    window.addEventListener('storage', function (e) {
        if (e.key === 'nw_main_articles_invalidate') nwThrottleFetchMainPublicList();
    });

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

(function nwInitSectionNavHrefs() {
    function apply() {
        nwApplySectionNavHrefs();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }
})();
