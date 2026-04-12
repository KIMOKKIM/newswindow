/**
 * Article body HTML shared by home modal and article.html (load with nw-seo.js optional).
 */
(function (global) {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }
  function para(t) {
    return esc(t).replace(/\n/g, '</p><p>');
  }
  function reporterDisplayName(name) {
    var n = name == null ? '' : String(name).trim();
    if (!n) return '\uae30\uc790';
    if (/\uae30\uc790\s*$/.test(n)) return n;
    return n + ' \uae30\uc790';
  }
  function authorProfileHref(displayNameRaw) {
    var n = displayNameRaw == null ? '' : String(displayNameRaw).trim();
    if (!n) return '';
    return 'author.html?name=' + encodeURIComponent(n);
  }
  function authorBylineHtml(displayNameRaw) {
    var n = displayNameRaw == null ? '' : String(displayNameRaw).trim();
    var label = reporterDisplayName(n);
    var href = authorProfileHref(n);
    if (!href) return esc(label);
    return '<a class="nw-article-detail__author-link" href="' + escAttr(href) + '">' + esc(label) + '</a>';
  }
  function formatArticleMetaDateYmd(raw) {
    if (raw == null || String(raw).trim() === '') return '\u2014';
    var s = String(raw).replace(' ', 'T');
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10) || '\u2014';
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + day;
  }
  function articleMainImageSrc(img, uploadOrigin, apiOrigin) {
    var v = String(img || '').trim();
    if (!v) return '';
    if (v.indexOf('data:') === 0) return v;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.charAt(0) === '/' && v.indexOf('/uploads/') === 0) {
      var base = String(uploadOrigin || apiOrigin || '').replace(/\/+$/, '');
      return base ? base + v : v;
    }
    return 'data:image/jpeg;base64,' + v;
  }
  function buildSummaryHtml(a) {
    var sum = a.summary && String(a.summary).trim() ? String(a.summary).trim() : '';
    var lines = [];
    if (sum) {
      lines = sum.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    } else {
      var c = (a.content1 || a.content || '').trim();
      if (!c) return '';
      var one = c.replace(/\s+/g, ' ');
      if (one.length > 360) one = one.slice(0, 357) + '\u2026';
      lines = [one];
    }
    var box = [];
    box.push('<aside class="nw-article-detail__summary" aria-labelledby="nwArticleSummaryTitle">');
    box.push(
      '<h2 class="nw-article-detail__summary-title" id="nwArticleSummaryTitle">\ud575\uc2ec \uc694\uc57d \xb7 \ud55c\ub208\uc5d0 \ubcf4\uae30</h2>'
    );
    if (lines.length === 1) {
      box.push('<p class="nw-article-detail__summary-lead">' + esc(lines[0]) + '</p>');
    } else {
      box.push('<ul class="nw-article-detail__summary-list">');
      lines.forEach(function (ln) {
        box.push('<li>' + esc(ln) + '</li>');
      });
      box.push('</ul>');
    }
    box.push(
      '<p class="nw-article-detail__summary-hint">\ubb34\uc5c7\uc774 \uc77c\uc5b4\ub0ac\ub294\uc9c0, \uc65c \uc911\uc694\ud55c\uc9c0, \ub204\uac00 \uc601\ud5a5\uc744 \ubc1b\ub294\uc9c0\ub294 \ubcf8\ubb38\uc5d0\uc11c \uc790\uc138\ud788 \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.</p>'
    );
    box.push('</aside>');
    return box.join('');
  }
  function blockParts(parts, img, cap, content, uploadOrigin, apiOrigin, titleForAlt) {
    if (content) parts.push('<p>' + para(content) + '</p>');
    if (img) {
      var src = articleMainImageSrc(img, uploadOrigin, apiOrigin);
      if (src) {
        var alt = '';
        if (cap && String(cap).trim()) alt = String(cap).trim();
        else if (titleForAlt && String(titleForAlt).trim()) alt = String(titleForAlt).trim();
        parts.push(
          '<img class="nw-article-detail__img nw-article-img" src="' +
            escAttr(src) +
            '" alt="' +
            escAttr(alt || '\uae30\uc0ac \uc774\ubbf8\uc9c0') +
            '">'
        );
      }
    }
    if (cap) parts.push('<p class="nw-article-detail__cap">' + esc(cap) + '</p>');
  }
  function buildArticleBodyScrollHtml(a, uploadOrigin, apiOrigin) {
    var titleForAlt = a.title || '';
    var parts = [];
    parts.push('<div class="nw-article-detail__article-scroll">');
    parts.push('<div class="nw-article-detail__article-body">');
    blockParts(parts, a.image1, a.image1_caption, a.content1, uploadOrigin, apiOrigin, titleForAlt);
    blockParts(parts, a.image2, a.image2_caption, a.content2, uploadOrigin, apiOrigin, titleForAlt);
    blockParts(parts, a.image3, a.image3_caption, a.content3, uploadOrigin, apiOrigin, titleForAlt);
    blockParts(parts, a.image4, a.image4_caption, a.content4, uploadOrigin, apiOrigin, titleForAlt);
    if (!a.content1 && !a.content2 && !a.content3 && !a.content4 && a.content) {
      parts.push('<p>' + para(a.content) + '</p>');
    }
    parts.push('</div>');
    parts.push(
      '<section class="nw-related-articles" id="nwRelatedMount" aria-label="\uad00\ub828 \uae30\uc0ac"><h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><p class="nw-related-loading" role="status">\uad00\ub828 \uae30\uc0ac\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\u2026</p></section>'
    );
    parts.push(
      '<p class="nw-article-detail__legal">\uc800\uc791\uad8c\uc790 \xa9 \ub274\uc2a4\uc758\ucc3d \ubb34\ub2e8\uc804\uc7ac \ubc0f \uc7ac\ubc30\ud3ec \uae08\uc9c0</p>'
    );
    parts.push('</div>');
    return parts.join('');
  }
  function buildMastheadHtml(a, categoryLabel) {
    var mast = [];
    mast.push('<div class="nw-article-detail__masthead">');
    mast.push(
      '<h1 id="nwArticleDetailTitle" class="nw-article-detail__title">' +
        esc(a.title || '(\uc81c\ubaa9 \uc5c6\uc74c)') +
        '</h1>'
    );
    if (a.subtitle) mast.push('<p class="nw-article-detail__subtitle">' + esc(a.subtitle) + '</p>');
    var pubRaw = a.published_at && String(a.published_at).trim() ? a.published_at : a.created_at;
    var updRaw = a.updated_at && String(a.updated_at).trim() ? a.updated_at : a.created_at;
    var catShown = categoryLabel || '\u2014';
    var byline =
      authorBylineHtml(a.author_name) +
      ' \xb7 \ubc1c\ud589\uc77c ' +
      formatArticleMetaDateYmd(pubRaw) +
      ' \xb7 \uc218\uc815\uc77c ' +
      formatArticleMetaDateYmd(updRaw);
    mast.push('<p class="nw-article-detail__meta nw-article-detail__meta--preview">');
    mast.push('<span class="nw-article-detail__meta-cat">' + esc(catShown) + '</span> ');
    mast.push('<span class="nw-article-detail__meta-byline">' + byline + '</span>');
    mast.push('</p>');
    var catVal = String(a.category || '').trim();
    if (catVal) {
      mast.push(
        '<nav class="nw-article-detail__section-nav" aria-label="\uc139\uc158">' +
          '<a href="section.html?category=' +
          encodeURIComponent(catVal) +
          '">' +
          esc(catShown) +
          ' \uc139\uc158 \ub354\ubcf4\uae30</a></nav>'
      );
    }
    mast.push('</div>');
    return mast.join('');
  }
  function buildDetailHtml(a, opts) {
    opts = opts || {};
    var uploadOrigin = opts.uploadOrigin || '';
    var apiOrigin = opts.apiOrigin || '';
    var categoryLabel = opts.categoryLabel || a.category || '\u2014';
    return (
      buildMastheadHtml(a, categoryLabel) +
      buildSummaryHtml(a) +
      buildArticleBodyScrollHtml(a, uploadOrigin, apiOrigin)
    );
  }
  function fetchRelatedArticles(apiBase, articleId, category, mountEl) {
    var el =
      mountEl || (typeof document !== 'undefined' ? document.getElementById('nwRelatedMount') : null);
    if (!el || !apiBase || !articleId || !String(category || '').trim()) {
      if (el) el.innerHTML = '';
      return;
    }
    var url =
      apiBase.replace(/\/+$/, '') +
      '/api/articles/public/page?page=1&limit=6&category=' +
      encodeURIComponent(String(category).trim()) +
      '&exclude_id=' +
      encodeURIComponent(String(articleId));
    fetch(url, { cache: 'no-store', credentials: 'omit' })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject();
      })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (!items.length) {
          el.innerHTML =
            '<h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><p class="nw-related-empty">\ud45c\uc2dc\ud560 \uad00\ub828 \uae30\uc0ac\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</p>';
          return;
        }
        var html =
          '<h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><ul class="nw-related-list">';
        items.forEach(function (it) {
          html +=
            '<li><a href="article.html?id=' +
            escAttr(String(it.id)) +
            '">' +
            esc(it.title || '') +
            '</a></li>';
        });
        html += '</ul>';
        el.innerHTML = html;
      })
      .catch(function () {
        el.innerHTML =
          '<h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><p class="nw-related-empty">\uad00\ub828 \uae30\uc0ac\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.</p>';
      });
  }
  global.NW_ARTICLE_RENDER = {
    buildDetailHtml: buildDetailHtml,
    fetchRelatedArticles: fetchRelatedArticles,
    articleMainImageSrc: articleMainImageSrc,
    reporterDisplayName: reporterDisplayName,
    authorProfileHref: authorProfileHref,
    esc: esc,
    escAttr: escAttr,
  };
})(typeof window !== 'undefined' ? window : this);
