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

var ADS_API = (typeof window !== 'undefined' && window.NW_CONFIG && window.NW_CONFIG.API_BASE)
    ? window.NW_CONFIG.API_BASE
    : 'http://127.0.0.1:3001';

/** 메인 헤드라인 캐러셀 자동 롤링 (ms) */
var HEADLINE_CAROUSEL_INTERVAL_MS = 3000;
var headlineCarouselTimer = null;

function headlineThumbSrc(a) {
    var t = (a && a.thumb) ? String(a.thumb).trim() : '';
    if (t) return t;
    return footerAdPlaceholder('이미지 준비중');
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
        if (ads.headerLeft.src) leftImg.src = ads.headerLeft.src;
        var lh = (ads.headerLeft.href || '#').toString().trim().replace(/^#+/, '');
        leftLink.href = lh || '#';
        leftLink.target = '_blank';
        leftLink.rel = 'noopener noreferrer';
    }
    if (ads.headerRight && rightImg && rightLink) {
        if (ads.headerRight.src) rightImg.src = ads.headerRight.src;
        var rh = (ads.headerRight.href || '#').toString().trim().replace(/^#+/, '');
        rightLink.href = rh || '#';
        rightLink.target = '_blank';
        rightLink.rel = 'noopener noreferrer';
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
    if (a) {
        var ah = (href || '#').toString().trim().replace(/^#+/, '');
        a.href = ah || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
    }
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
        img.src = src;
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
        a.href = ad.href || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        var img = document.createElement('img');
        img.src = ad.image && ad.image.indexOf('data:') !== 0 ? ad.image : footerAdPlaceholder(ad.alt);
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

function sortByLatest(list) {
    return (Array.isArray(list) ? list.slice() : []).sort(function (a, b) {
        return parseCreatedAt(b.created_at) - parseCreatedAt(a.created_at);
    });
}

function renderHeadlineCarouselFromPublished(list) {
    var root = document.getElementById('headlineCarousel');
    var track = document.getElementById('headlineCarouselTrack');
    var dotsWrap = document.getElementById('headlineCarouselDots');
    var listEl = document.getElementById('headlineCarouselList');
    if (!root || !track || !dotsWrap || !listEl || !Array.isArray(list) || list.length === 0) return;

    if (headlineCarouselTimer) {
        clearInterval(headlineCarouselTimer);
        headlineCarouselTimer = null;
    }

    var ordered = sortByLatest(list);
    var slides = ordered.slice(0, 5);
    if (slides.length === 0) return;

    track.innerHTML = '';
    dotsWrap.innerHTML = '';
    listEl.innerHTML = '';

    var i;
    for (i = 0; i < slides.length; i++) {
        (function (idx) {
            var a = slides[idx];
            var slide = document.createElement('div');
            slide.className = 'headline-slide' + (idx === 0 ? ' is-active' : '');
            slide.setAttribute('aria-label', '헤드라인 ' + (idx + 1) + ' / ' + slides.length);

            var link = document.createElement('a');
            link.className = 'headline-slide-link public-article-link';
            link.href = publicArticleHref(a.id);
            link.setAttribute('data-public-article-id', String(a.id));

            var media = document.createElement('div');
            media.className = 'headline-slide-media';
            var img = document.createElement('img');
            img.className = 'headline-slide-img';
            img.alt = '';
            img.decoding = 'async';
            img.loading = idx === 0 ? 'eager' : 'lazy';
            img.src = headlineThumbSrc(a);
            media.appendChild(img);

            link.appendChild(media);
            slide.appendChild(link);
            track.appendChild(slide);

            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'headline-carousel-dot' + (idx === 0 ? ' is-active' : '');
            dot.setAttribute('aria-label', (idx + 1) + '번 기사');
            dot.setAttribute('data-idx', String(idx));
            dotsWrap.appendChild(dot);

            var li = document.createElement('li');
            li.className = 'headline-carousel-list-item' + (idx === 0 ? ' is-active' : '');
            li.setAttribute('data-idx', String(idx));
            var listA = document.createElement('a');
            listA.className = 'public-article-link';
            listA.href = publicArticleHref(a.id);
            listA.setAttribute('data-public-article-id', String(a.id));
            listA.textContent = cleanBrokenKoreanText(a.title, '제목 준비중');
            var metaSpan = document.createElement('span');
            metaSpan.className = 'meta';
            var catSpan = document.createElement('span');
            catSpan.className = 'category';
            catSpan.textContent = cleanBrokenKoreanText(a.category, '뉴스');
            metaSpan.appendChild(catSpan);
            metaSpan.appendChild(document.createTextNode(' | ' + toDate(a.created_at)));
            li.appendChild(listA);
            li.appendChild(metaSpan);
            listEl.appendChild(li);
        })(i);
    }

    var slideEls = track.querySelectorAll('.headline-slide');
    var dotEls = dotsWrap.querySelectorAll('.headline-carousel-dot');
    var idx = 0;

    function go(n) {
        idx = (n + slideEls.length) % slideEls.length;
        var j;
        for (j = 0; j < slideEls.length; j++) {
            slideEls[j].classList.toggle('is-active', j === idx);
        }
        for (j = 0; j < dotEls.length; j++) {
            dotEls[j].classList.toggle('is-active', j === idx);
        }
        var listItems = listEl.querySelectorAll('.headline-carousel-list-item');
        for (j = 0; j < listItems.length; j++) {
            listItems[j].classList.toggle('is-active', j === idx);
        }
    }

    function startAuto() {
        if (headlineCarouselTimer) clearInterval(headlineCarouselTimer);
        headlineCarouselTimer = setInterval(function () {
            go(idx + 1);
        }, HEADLINE_CAROUSEL_INTERVAL_MS);
    }

    dotsWrap.addEventListener('click', function (ev) {
        var btn = ev.target.closest('.headline-carousel-dot');
        if (!btn) return;
        go(parseInt(btn.getAttribute('data-idx'), 10));
        startAuto();
    });

    root.addEventListener('mouseenter', function () {
        if (headlineCarouselTimer) {
            clearInterval(headlineCarouselTimer);
            headlineCarouselTimer = null;
        }
    });
    root.addEventListener('mouseleave', function () {
        startAuto();
    });

    listEl.querySelectorAll('.headline-carousel-list-item').forEach(function (li, j) {
        li.addEventListener('mouseenter', function () {
            go(j);
        });
    });

    startAuto();
}

function renderSectionListsByCategory(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    var groups = {};
    sortByLatest(list).forEach(function (a) {
        var key = majorCategory(a.category);
        if (!key) return;
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

document.addEventListener('DOMContentLoaded', function () {
    bindPublicArticleLinkStorage();

    // 광고 설정 API에서 불러와 적용 (실패 시 기본값 사용)
    fetch(ADS_API + '/api/ads')
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

    // 편집장 승인(published) 기사 메인 자동 반영
    fetch(ADS_API + '/api/articles/public/list')
        .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (articles) {
            if (!Array.isArray(articles) || articles.length === 0) return;
            renderHeadlineCarouselFromPublished(articles);
            renderSectionListsByCategory(articles);
            renderTvSectionByCategory(articles);
        })
        .catch(function () {});

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
        '.headline-main a, .headline-list a, .headline-slide-link, .headline-carousel-list-item a, .section-list a, .side-box a, .tv-item a, .focus-item a, .people-item a, .photo-item a'
    );
    hoverTargets.forEach(function (el) {
        el.addEventListener('mouseenter', function () {
            this.style.transition = 'color 0.15s ease';
        });
    });
});
