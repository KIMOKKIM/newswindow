/**
 * Article body HTML shared by home modal and article.html (load with nw-seo.js optional).
 * Single-column flow: title → meta → lead image (image1-first via resolveArticlePrimaryImage) → body.
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

  function detailImgUrl(raw, uploadOrigin, apiOrigin) {
    if (raw == null || String(raw).trim() === '') return '';
    if (typeof global.resolveArticleListThumb === 'function') {
      var u = global.resolveArticleListThumb(String(raw));
      if (u) return u;
    }
    return articleMainImageSrc(raw, uploadOrigin, apiOrigin);
  }

  function isProbablyHtml(str) {
    if (str == null || typeof str !== 'string') return false;
    var t = str.trim();
    if (!t) return false;
    return /<\/[a-z][a-z0-9]*\s*>/i.test(t) || (/<[a-z][a-z0-9]*[^>]*\/?>/i.test(t) && t.length > 24);
  }

  var NW_DETAIL_PLACEHOLDER_SRC = '/images/logo-header-tight.png';

  function blockParts(parts, img, cap, content, uploadOrigin, apiOrigin, titleForAlt) {
    if (content) parts.push('<p>' + para(content) + '</p>');
    if (img) {
      var src = detailImgUrl(img, uploadOrigin, apiOrigin);
      if (src) {
        var alt = '';
        if (cap && String(cap).trim()) alt = String(cap).trim();
        else if (titleForAlt && String(titleForAlt).trim()) alt = String(titleForAlt).trim();
        parts.push(
          '<img class="nw-article-detail__img nw-article-img" src="' +
            escAttr(src) +
            '" alt="' +
            escAttr(alt || '\uae30\uc0ac \uc774\ubbf8\uc9c0') +
            '" onerror="this.onerror=null;this.src=\'' +
            NW_DETAIL_PLACEHOLDER_SRC +
            '\'">'
        );
      }
    }
    if (cap) parts.push('<p class="nw-article-detail__cap">' + esc(cap) + '</p>');
  }

  function buildMastheadHtml(a, categoryLabel, mastOpts) {
    mastOpts = mastOpts || {};
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

  function buildLeadFigureHtml(leadSrc, titleForAlt) {
    if (!leadSrc) return '';
    var altLead = esc(titleForAlt || '\uae30\uc0ac \uc774\ubbf8\uc9c0');
    return (
      '<figure class="nw-article-detail__lead">' +
        '<img class="nw-article-detail__lead-img nw-article-img" src="' +
        escAttr(leadSrc) +
        '" alt="' +
        altLead +
        '" onerror="this.onerror=null;this.src=\'' +
        NW_DETAIL_PLACEHOLDER_SRC +
        '\'">' +
        '</figure>'
    );
  }

  function buildArticleFlowHtml(a, uploadOrigin, apiOrigin, leadAbsNorm) {
    var titleForAlt = a.title || '';
    var parts = [];
    parts.push('<div class="nw-article-detail__article-body nw-article-detail__article-body--single">');
    var hasBlocks = [a.content1, a.content2, a.content3, a.content4].some(function (x) {
      return x && String(x).trim();
    });
    var rich = String(a.html || a.body || '').trim();
    if (!hasBlocks && rich && isProbablyHtml(rich)) {
      parts.push('<div class="nw-article-detail__rich">' + rich + '</div>');
    } else if (!hasBlocks && a.content && String(a.content).trim()) {
      var c = String(a.content).trim();
      if (isProbablyHtml(c)) {
        parts.push('<div class="nw-article-detail__rich">' + c + '</div>');
      } else {
        parts.push('<p>' + para(c) + '</p>');
      }
    } else {
      var img1Abs = a.image1 ? detailImgUrl(a.image1, uploadOrigin, apiOrigin) : '';
      var skipFirstImg = !!(leadAbsNorm && img1Abs && leadAbsNorm === img1Abs);
      var firstImg = skipFirstImg ? '' : a.image1;
      blockParts(parts, firstImg, a.image1_caption, a.content1, uploadOrigin, apiOrigin, titleForAlt);
      blockParts(parts, a.image2, a.image2_caption, a.content2, uploadOrigin, apiOrigin, titleForAlt);
      blockParts(parts, a.image3, a.image3_caption, a.content3, uploadOrigin, apiOrigin, titleForAlt);
      blockParts(parts, a.image4, a.image4_caption, a.content4, uploadOrigin, apiOrigin, titleForAlt);
      if (!a.content1 && !a.content2 && !a.content3 && !a.content4 && a.content) {
        parts.push('<p>' + para(a.content) + '</p>');
      }
    }
    parts.push('</div>');
    parts.push(
      '<section class="nw-related-articles" id="nwRelatedMount" aria-label="\uad00\ub828 \uae30\uc0ac"><h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><p class="nw-related-loading" role="status">\uad00\ub828 \uae30\uc0ac\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\u2026</p></section>'
    );
    parts.push(
      '<p class="nw-article-detail__legal">\uc800\uc791\uad8c\uc790 \xa9 \ub274\uc2a4\uc758\ucc3d \ubb34\ub2e8\uc804\uc7ac \ubc0f \uc7ac\ubc30\ud3ec \uae08\uc9c0</p>'
    );
    return parts.join('');
  }

  var NW_FETCH_TIMEOUT_MS = 20000;

  function fetchJsonGetWithRetry(url) {
    function inner(isRetry) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
      }, NW_FETCH_TIMEOUT_MS);
      return fetch(url, { cache: 'no-store', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          clearTimeout(timer);
          try {
            var rid = res.headers.get('X-Request-Id');
            if (rid && typeof console !== 'undefined' && console.info) {
              console.info('[nw/fetch]', url, 'X-Request-Id:', rid, isRetry ? '(retry)' : '');
            }
          } catch (e0) {}
          return res.text().then(function (t) {
            var data;
            try {
              data = t ? JSON.parse(t) : null;
            } catch (eJ) {
              return Promise.reject(new Error('JSON'));
            }
            return { res: res, data: data };
          });
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (!isRetry && err && (err.name === 'AbortError' || err.name === 'TypeError')) {
            return inner(true);
          }
          return Promise.reject(err);
        });
    }
    return inner(false);
  }

  function buildDetailHtml(a, opts) {
    if (a == null || typeof a !== 'object' || Array.isArray(a)) {
      return '<p class="nw-article-detail__error" role="alert">\uae30\uc0ac \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.</p>';
    }
    opts = opts || {};
    var uploadOrigin = opts.uploadOrigin || '';
    var apiOrigin = opts.apiOrigin || '';
    var categoryLabel = opts.categoryLabel || a.category || '\u2014';
    var mastHtml = buildMastheadHtml(a, categoryLabel, { uploadOrigin: uploadOrigin, apiOrigin: apiOrigin });
    var leadNorm =
      typeof global.resolveArticlePrimaryImage === 'function' ? global.resolveArticlePrimaryImage(a) : '';
    var leadSrc = leadNorm ? detailImgUrl(leadNorm, uploadOrigin, apiOrigin) : '';
    var leadHtml = buildLeadFigureHtml(leadSrc, a.title || '');
    var flowHtml = buildArticleFlowHtml(a, uploadOrigin, apiOrigin, leadSrc);
    return '<div class="nw-article-detail nw-article-detail--single">' + mastHtml + leadHtml + flowHtml + '</div>';
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
    fetchJsonGetWithRetry(url)
      .then(function (out) {
        return out.res.ok ? out.data : Promise.reject();
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
    fetchJsonGetWithRetry: fetchJsonGetWithRetry,
    fetchRelatedArticles: fetchRelatedArticles,
    articleMainImageSrc: articleMainImageSrc,
    reporterDisplayName: reporterDisplayName,
    authorProfileHref: authorProfileHref,
    esc: esc,
    escAttr: escAttr,
  };
})(typeof window !== 'undefined' ? window : this);
