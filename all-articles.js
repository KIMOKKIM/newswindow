/**
 * 전체기사 페이지: 최신순 페이지네이션 + 보기 전환 + 우측 인기 기사
 */
(function () {
  var API = (function () {
    try {
      var h = String(location.hostname || '').trim().toLowerCase();
      if (!h) return 'http://127.0.0.1:3000';
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return 'http://127.0.0.1:3000';
      if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h))
        return 'http://127.0.0.1:3000';
    } catch (e) {}
    return '';
  })();

  var PAGE_SIZE = 20;
  var GROUP = 5;
  var VIEW_KEY = 'nw_all_articles_view';
  var mount = document.getElementById('aaListMount');
  var pagerEl = document.getElementById('aaPager');
  var totalEl = document.getElementById('aaTotal');
  var popularEl = document.getElementById('aaPopular');
  var filterInput = document.getElementById('aaPopularFilter');
  var popularData = [];

  function articleUrl(id) {
    return 'article.html?id=' + encodeURIComponent(String(id));
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
      var thumb = it.thumb ? '<img src="' + esc(it.thumb) + '" alt="" loading="lazy">' : '';
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

  function drawPager(page, totalPages) {
    if (!pagerEl) return;
    if (totalPages <= 1) {
      pagerEl.innerHTML = '';
      return;
    }
    var qs = function (p) {
      return 'all-articles.html?page=' + p;
    };
    var html = '<div class="aa-pager-inner">';
    if (page > 1) html += '<a class="aa-pager-btn" href="' + qs(page - 1) + '">이전</a>';
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (var p = start; p <= end; p++) {
      if (p === page)
        html += '<span class="aa-pager-num is-current" aria-current="page">' + p + '</span>';
      else html += '<a class="aa-pager-num" href="' + qs(p) + '">' + p + '</a>';
    }
    if (page < totalPages) html += '<a class="aa-pager-btn" href="' + qs(page + 1) + '">다음</a>';
    html += '</div>';
    pagerEl.innerHTML = html;
  }

  function renderPopular(list) {
    if (!popularEl) return;
    if (!list.length) {
      popularEl.innerHTML = '<li class="aa-pop-empty">최근 3개월 내 게시된 기사가 없습니다.</li>';
      return;
    }
    var q = filterInput ? String(filterInput.value || '').trim().toLowerCase() : '';
    var html = '';
    var rank = 0;
    for (var i = 0; i < list.length; i++) {
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

  function load() {
    var params = new URLSearchParams(location.search);
    var page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    setView(getView());

    mount.innerHTML = '<p class="aa-loading">불러오는 중…</p>';

    fetch(API + '/api/articles/public/page?page=' + page + '&limit=' + PAGE_SIZE, { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      })
      .then(function (data) {
        if (totalEl) totalEl.textContent = String(data.total != null ? data.total : 0);
        drawMain(data.items || [], getView());
        drawPager(data.page || 1, data.totalPages || 1);
      })
      .catch(function () {
        if (mount) mount.innerHTML = '<p class="aa-error">기사 목록을 불러오지 못했습니다.</p>';
      });

    fetch(API + '/api/articles/public/popular?months=3&limit=10', { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      })
      .then(function (rows) {
        popularData = Array.isArray(rows) ? rows : [];
        renderPopular(popularData);
      })
      .catch(function () {
        if (popularEl) popularEl.innerHTML = '<li class="aa-pop-empty">순위를 불러오지 못했습니다.</li>';
      });
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
        fetch(API + '/api/articles/public/page?page=' + page + '&limit=' + PAGE_SIZE, { cache: 'no-store' })
          .then(function (r) {
            return r.ok ? r.json() : Promise.reject();
          })
          .then(function (data) {
            drawMain(data.items || [], pair[1]);
          })
          .catch(function () {});
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.setAttribute('data-aa-view', getView());
    setView(getView());
    bindViewButtons();
    if (filterInput) {
      filterInput.addEventListener('input', function () {
        renderPopular(popularData);
      });
    }
    load();
  });
})();
