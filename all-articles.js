/**
 * 전체기사 페이지: 서버 페이지네이션(기본 5건) + 제목 검색 + 우측 인기 기사
 */
(function () {
  var NW_PRODUCTION_API_ORIGIN = 'https://newswindow-backend.onrender.com';

  function nwIsProductionNewswindowHost(hostname) {
    var hl = (hostname || '').trim().toLowerCase();
    if (!hl) return false;
    return hl === 'newswindow.kr' || hl.slice(-14) === '.newswindow.kr';
  }

  var NW_CONFIG_API_ORIGIN = (function () {
    try {
      if (typeof window === 'undefined' || window.NW_API_ORIGIN == null) return '';
      return String(window.NW_API_ORIGIN).trim().replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  })();

  var NW_PUBLIC_UPLOAD_ORIGIN = (function () {
    try {
      if (typeof window === 'undefined' || window.NW_PUBLIC_UPLOAD_ORIGIN == null) return '';
      return String(window.NW_PUBLIC_UPLOAD_ORIGIN).trim().replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  })();

  var API = (function () {
    try {
      var h = String(location.hostname || '').trim().toLowerCase();
      if (!h) return 'http://127.0.0.1:3000';
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return 'http://127.0.0.1:3000';
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h))
        return 'http://127.0.0.1:3000';
      if (nwIsProductionNewswindowHost(h)) return NW_PRODUCTION_API_ORIGIN;
    } catch (e) {}
    return NW_CONFIG_API_ORIGIN || '';
  })();

  var PAGE_SIZE = 5;
  var GROUP = 5;
  var VIEW_KEY = 'nw_all_articles_view';
  var mount = document.getElementById('aaListMount');
  var pagerEl = document.getElementById('aaPager');
  var totalEl = document.getElementById('aaTotal');
  var popularEl = document.getElementById('aaPopular');
  var filterInput = document.getElementById('aaPopularFilter');
  var listSearchInput = document.getElementById('aaListSearch');
  var popularData = [];

  function articleUrl(id) {
    return 'article.html?id=' + encodeURIComponent(String(id));
  }

  function resolveThumb(src) {
    var v = String(src || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.indexOf('data:') === 0) return v;
    if (v.charAt(0) === '/' && v.indexOf('/uploads/') === 0) {
      var base = (NW_PUBLIC_UPLOAD_ORIGIN || API || '').replace(/\/+$/, '');
      return base ? base + v : v;
    }
    return v;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtNewsDate(s) {
    if (!s) return '';
    var t = Date.parse(String(s).replace(' ', 'T'));
    if (!isFinite(t)) return String(s).slice(0, 16);
    var d = new Date(t);
    function pad(n) {
      return n < 10 ? '0' + n : '' + n;
    }
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes())
    );
  }

  function reporterLine(name) {
    var n = String(name || '').trim();
    if (!n) return '기자';
    if (/기자$/.test(n)) return n;
    return n + ' 기자';
  }

  function getView() {
    try {
      var v = localStorage.getItem(VIEW_KEY);
      if (v === 'compact' || v === 'list' || v === 'card') return v;
    } catch (e) {}
    return 'list';
  }

  function setView(v) {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch (e) {}
    document.documentElement.setAttribute('data-aa-view', v);
    var ids = { compact: 'aaViewCompact', list: 'aaViewList', card: 'aaViewCard' };
    Object.keys(ids).forEach(function (mode) {
      var btn = document.getElementById(ids[mode]);
      if (!btn) return;
      var on = mode === v;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function renderGroupsHTML(items, rowHtmlFn) {
    var html = '';
    for (var i = 0; i < items.length; i++) {
      if (i > 0 && i % GROUP === 0) html += '<div class="aa-group-sep" role="separator"></div>';
      html += rowHtmlFn(items[i], i);
    }
    return html;
  }

  function renderList(items) {
    return renderGroupsHTML(items, function (it) {
      var cat = esc(it.category || '뉴스');
      var title = esc(it.title || '');
      var auth = esc(reporterLine(it.author_name));
      var dt = esc(fmtNewsDate(it.published_at));
      return (
        '<article class="aa-row aa-row--list">' +
        '<a class="aa-row-link" href="' +
        esc(articleUrl(it.id)) +
        '">' +
        '<span class="aa-row-cat">[' +
        cat +
        ']</span> ' +
        '<span class="aa-row-title">' +
        title +
        '</span>' +
        '</a>' +
        '<div class="aa-row-meta">' +
        auth +
        ' <span class="aa-row-sep">|</span> ' +
        dt +
        '</div>' +
        '</article>'
      );
    });
  }

  function renderCompact(items) {
    return renderGroupsHTML(items, function (it) {
      var cat = esc(it.category || '');
      var title = esc(it.title || '');
      return (
        '<article class="aa-row aa-row--compact">' +
        '<a class="aa-row-link" href="' +
        esc(articleUrl(it.id)) +
        '">' +
        '<span class="aa-row-cat">[' +
        cat +
        ']</span> ' +
        '<span class="aa-row-title">' +
        title +
        '</span>' +
        '</a>' +
        '</article>'
      );
    });
  }

  function renderCards(items) {
    var html = '<div class="aa-card-grid">';
    items.forEach(function (it) {
      var rawThumb = it.thumb || '';
      var thumbUrl = resolveThumb(rawThumb);
      var thumb = thumbUrl ? '<img src="' + esc(thumbUrl) + '" alt="" loading="lazy" decoding="async">' : '';
      html +=
        '<article class="aa-card">' +
        '<a href="' +
        esc(articleUrl(it.id)) +
        '" class="aa-card-link">' +
        '<div class="aa-card-media">' +
        (thumb || '<div class="aa-card-ph"></div>') +
        '</div>' +
        '<div class="aa-card-body"><span class="aa-card-cat">[' +
        esc(it.category || '뉴스') +
        ']</span> ' +
        '<h3 class="aa-card-title">' +
        esc(it.title || '') +
        '</h3>' +
        '<p class="aa-card-meta">' +
        esc(reporterLine(it.author_name)) +
        ' · ' +
        esc(fmtNewsDate(it.published_at)) +
        '</p></div>' +
        '</a></article>';
    });
    html += '</div>';
    return html;
  }

  function drawMain(items, view) {
    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = '<p class="aa-empty">표시할 기사가 없습니다.</p>';
      return;
    }
    if (view === 'compact') mount.innerHTML = renderCompact(items);
    else if (view === 'card') mount.innerHTML = renderCards(items);
    else mount.innerHTML = renderList(items);
  }

  function buildPageHref(page, q) {
    try {
      var u = new URL('all-articles.html', window.location.href);
      u.searchParams.set('page', String(page));
      if (q && String(q).trim()) u.searchParams.set('q', String(q).trim());
      else u.searchParams.delete('q');
      return u.pathname.split('/').pop() + u.search;
    } catch (e) {
      var qs = 'page=' + encodeURIComponent(String(page));
      if (q && String(q).trim()) qs += '&q=' + encodeURIComponent(String(q).trim());
      return 'all-articles.html?' + qs;
    }
  }

  function drawPager(page, totalPages, q) {
    if (!pagerEl) return;
    if (totalPages <= 1) {
      pagerEl.innerHTML = '';
      return;
    }
    var html = '<div class="aa-pager-inner">';
    if (page > 1) html += '<a class="aa-pager-btn" href="' + esc(buildPageHref(page - 1, q)) + '">이전</a>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    var p;
    for (p = start; p <= end; p++) {
      if (p === page)
        html += '<span class="aa-pager-num is-current" aria-current="page">' + p + '</span>';
      else html += '<a class="aa-pager-num" href="' + esc(buildPageHref(p, q)) + '">' + p + '</a>';
    }
    if (page < totalPages) html += '<a class="aa-pager-btn" href="' + esc(buildPageHref(page + 1, q)) + '">다음</a>';
    html += '</div>';
    pagerEl.innerHTML = html;
  }

  function normalizePagePayload(data) {
    if (!data || typeof data !== 'object') return { items: [], total: 0, page: 1, totalPages: 1 };
    var items = data.items;
    if (!Array.isArray(items) && Array.isArray(data.articles)) items = data.articles;
    if (!Array.isArray(items) && Array.isArray(data.latestArticles)) items = data.latestArticles;
    if (!Array.isArray(items)) items = [];
    return {
      items: items,
      total: data.total != null ? Number(data.total) : items.length,
      page: data.page != null ? Number(data.page) : 1,
      totalPages: data.totalPages != null ? Number(data.totalPages) : 1,
    };
  }

  function renderPopular(list) {
    if (!popularEl) return;
    if (!list.length) {
      popularEl.innerHTML = '<li class="aa-pop-empty">최근 많이 본 기사가 없습니다.</li>';
      return;
    }
    var q = filterInput ? String(filterInput.value || '').trim().toLowerCase() : '';
    var html = '';
    var rank = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (q && String(it.title || '').toLowerCase().indexOf(q) === -1) continue;
      rank++;
      var cls = rank <= 3 ? 'aa-pop-item aa-pop-item--top' : 'aa-pop-item';
      html +=
        '<li class="' +
        cls +
        '">' +
        '<span class="aa-pop-rank">' +
        rank +
        '</span>' +
        '<a href="' +
        esc(articleUrl(it.id)) +
        '">' +
        esc(it.title || '') +
        '</a></li>';
    }
    if (!html) html = '<li class="aa-pop-empty">검색 결과가 없습니다.</li>';
    popularEl.innerHTML = html;
  }

  function fetchListPage(page, q, viewMode) {
    var qStr = q != null ? String(q).trim() : '';
    var url =
      API +
      '/api/articles/public/page?page=' +
      encodeURIComponent(String(page)) +
      '&limit=' +
      encodeURIComponent(String(PAGE_SIZE)) +
      (qStr ? '&q=' + encodeURIComponent(qStr) : '');
    mount.innerHTML = '<p class="aa-loading">불러오는 중…</p>';
    return fetch(url, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status));
        return r.json();
      })
      .then(function (data) {
        var pack = normalizePagePayload(data);
        if (totalEl) totalEl.textContent = String(pack.total);
        if (pack.total === 0) {
          if (qStr) {
            mount.innerHTML = '<p class="aa-empty">검색 결과가 없습니다.</p>';
          } else {
            mount.innerHTML = '<p class="aa-empty">등록된 기사가 없습니다.</p>';
          }
          drawPager(1, 1, qStr);
          return;
        }
        drawMain(pack.items, viewMode);
        drawPager(pack.page || 1, pack.totalPages || 1, qStr);
      })
      .catch(function () {
        if (mount) mount.innerHTML = '<p class="aa-error">기사 목록을 불러오지 못했습니다.</p>';
        if (totalEl) totalEl.textContent = '0';
        if (pagerEl) pagerEl.innerHTML = '';
      });
  }

  function fetchPopular() {
    fetch(API + '/api/articles/public/popular?days=30&limit=10', { cache: 'no-store', credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) return Promise.reject();
        return r.json();
      })
      .then(function (rows) {
        popularData = Array.isArray(rows) ? rows : [];
        renderPopular(popularData);
      })
      .catch(function () {
        if (popularEl) popularEl.innerHTML = '<li class="aa-pop-empty">순위를 불러오지 못했습니다.</li>';
      });
  }

  function load() {
    var params = new URLSearchParams(location.search);
    var page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    var q = params.get('q') != null ? String(params.get('q')) : '';
    if (listSearchInput) listSearchInput.value = q;
    setView(getView());
    fetchListPage(page, q, getView());
    fetchPopular();
  }

  function bindViewButtons() {
    var map = [
      ['aaViewCompact', 'compact'],
      ['aaViewList', 'list'],
      ['aaViewCard', 'card'],
    ];
    map.forEach(function (pair) {
      var btn = document.getElementById(pair[0]);
      if (!btn) return;
      btn.addEventListener('click', function () {
        setView(pair[1]);
        var params = new URLSearchParams(location.search);
        var page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
        var q = params.get('q') != null ? String(params.get('q')) : '';
        fetchListPage(page, q, pair[1]).catch(function () {});
      });
    });
  }

  function applyListSearchFromInput() {
    if (!listSearchInput) return;
    var q = String(listSearchInput.value || '').trim();
    var params = new URLSearchParams(location.search);
    params.set('page', '1');
    if (q) params.set('q', q);
    else params.delete('q');
    try {
      history.replaceState({}, '', 'all-articles.html?' + params.toString());
    } catch (e) {}
    fetchListPage(1, q, getView());
  }

  var listSearchTimer = null;
  function bindListSearch() {
    if (!listSearchInput) return;
    listSearchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (listSearchTimer) clearTimeout(listSearchTimer);
        applyListSearchFromInput();
      }
    });
    listSearchInput.addEventListener(
      'input',
      function () {
        if (listSearchTimer) clearTimeout(listSearchTimer);
        listSearchTimer = setTimeout(applyListSearchFromInput, 450);
      },
      { passive: true }
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('data-aa-view', getView());
    setView(getView());
    bindViewButtons();
    bindListSearch();
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        renderPopular(popularData);
      });
    }
    load();
  });
})();
