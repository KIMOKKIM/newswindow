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

var ADS_API = 'http://127.0.0.1:3001';

function applyHeaderAds(ads) {
    if (!ads) return;
    var leftImg = document.getElementById('headerAdLeftImg');
    var leftLink = document.getElementById('headerAdLeftLink');
    var rightImg = document.getElementById('headerAdRightImg');
    var rightLink = document.getElementById('headerAdRightLink');
    if (ads.headerLeft && leftImg && leftLink) {
        if (ads.headerLeft.src) leftImg.src = ads.headerLeft.src;
        leftLink.href = ads.headerLeft.href || '#';
    }
    if (ads.headerRight && rightImg && rightLink) {
        if (ads.headerRight.src) rightImg.src = ads.headerRight.src;
        rightLink.href = ads.headerRight.href || '#';
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
    if (a) a.href = href || '#';
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

document.addEventListener('DOMContentLoaded', function () {
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
