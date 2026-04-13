/**
 * Article HTML shared by home modal and article.html.
 * Detail markup matches admin article preview (shared/nwArticlePreviewBuild.core.js).
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
  /** Preview body text: same as admin esc (no quote escape in text nodes). */
  function escPlain(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  function nwCategoryLabelForValue(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    try {
      var m = global.NW_CATEGORY_VALUE_TO_LABEL;
      if (m && typeof m === 'object' && m[v]) return m[v];
    } catch (e0) {}
    return v;
  }

  /**
   * Keep in sync with shared/nwArticlePreviewBuild.core.js
   */
  function buildNwPreviewArticleInnerHtml(a, deps, options) {
    var escB = deps.esc;
    var escA = deps.escAttr;
    var categoryLabelForValue = deps.categoryLabelForValue;
    var reporterDN = deps.reporterDisplayName;
    var formatDate = deps.formatArticleMetaDateYmd;
    var opts = options || {};
    var toolbarHtml = opts.toolbarHtml || '';
    var resolveImgSrc =
      opts.resolveImgSrc ||
      function (src) {
        return escA(String(src == null ? '' : src));
      };
    var includeNwCard = opts.includeNwCard !== false;
    var wrapClass = 'nw-preview-article' + (includeNwCard ? ' nw-card' : '');

    var catShown = categoryLabelForValue(a.category || '') || '\u2014';
    var byline =
      reporterDN(a.author_name) +
      ' \xb7 \ubc1c\ud589\uc77c ' +
      formatDate(a.published_at || a.created_at) +
      ' \xb7 \uc218\uc815\uc77c ' +
      formatDate(a.updated_at || a.created_at);

    var blocks = '';
    var n;
    for (n = 1; n <= 4; n++) {
      var src = a['image' + n];
      var cap = a['image' + n + '_caption'];
      var cx = a['content' + n];
      if (cx) {
        blocks += '<div class="nw-prev-body">' + escB(cx).replace(/\n/g, '<br/>') + '</div>';
      }
      if (src) {
        blocks +=
          '<figure class="nw-prev-fig"><img src="' +
          resolveImgSrc(src) +
          '" alt="" class="nw-prev-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/logo-header-tight.png\'"/></figure>';
      }
      if (cap) blocks += '<p class="nw-prev-cap">' + escB(cap) + '</p>';
    }
    var fallbackBody = (a.content || '').trim();
    if (!blocks && fallbackBody) {
      blocks = '<div class="nw-prev-body">' + escB(fallbackBody).replace(/\n/g, '<br/>') + '</div>';
    }

    var metaBar =
      '<div class="nw-prev-meta-bar">' +
      '<span class="nw-prev-meta-cat">' +
      escB(catShown) +
      '</span>' +
      '<span class="nw-prev-meta-byline">' +
      escB(byline) +
      '</span></div>';

    return (
      toolbarHtml +
      '<article class="' +
      wrapClass +
      '">' +
      '<h2 class="nw-prev-title" id="nwArticleDetailTitle">' +
      escB(a.title || '(\uc81c\ubaa9 \uc5c6\uc74c)') +
      '</h2>' +
      (a.subtitle ? '<p class="nw-prev-sub">' + escB(a.subtitle) + '</p>' : '') +
      metaBar +
      '<div class="nw-prev-content">' +
      (blocks || '<p class="nw-muted">\ubcf8\ubb38 \uc5c6\uc74c</p>') +
      '</div>' +
      '<p class="nw-prev-legal">\uc800\uc791\uad8c\uc790 \xa9 \ub274\uc2a4\uc758\ucc3d \ubb34\ub2e8\uc804\uc7ac \ubc0f \uc7ac\ubc30\ud3ec \uae08\uc9c0</p>' +
      '</article>'
    );
  }

  var NW_FETCH_TIMEOUT_MS = 20000;
  var NW_RENDER_CAT_PROMISE = null;

  function ensurePublicCategoryMap() {
    if (global.NW_CATEGORY_VALUE_TO_LABEL && Object.keys(global.NW_CATEGORY_VALUE_TO_LABEL).length) {
      return Promise.resolve();
    }
    if (NW_RENDER_CAT_PROMISE) return NW_RENDER_CAT_PROMISE;
    var url;
    try {
      url = new URL('shared/articleCategories.json', global.location.href).href;
    } catch (eU) {
      url = 'shared/articleCategories.json';
    }
    NW_RENDER_CAT_PROMISE = fetch(url, { cache: 'force-cache' })
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
        global.NW_CATEGORY_VALUE_TO_LABEL = m;
      })
      .catch(function () {
        global.NW_CATEGORY_VALUE_TO_LABEL = global.NW_CATEGORY_VALUE_TO_LABEL || {};
      });
    return NW_RENDER_CAT_PROMISE;
  }

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
    var categoryLabelGetter = function (catVal) {
      if (opts.categoryLabel != null && String(opts.categoryLabel).trim() !== '') {
        return String(opts.categoryLabel).trim();
      }
      var mapped = nwCategoryLabelForValue(catVal);
      return mapped || '\u2014';
    };
    var inner = buildNwPreviewArticleInnerHtml(
      a,
      {
        esc: escPlain,
        escAttr: escAttr,
        categoryLabelForValue: categoryLabelGetter,
        reporterDisplayName: reporterDisplayName,
        formatArticleMetaDateYmd: formatArticleMetaDateYmd,
      },
      {
        toolbarHtml: '',
        resolveImgSrc: function (src) {
          return escAttr(detailImgUrl(src, uploadOrigin, apiOrigin));
        },
        includeNwCard: false,
      }
    );
    var related =
      '<section class="nw-related-articles" id="nwRelatedMount" aria-label="\uad00\ub828 \uae30\uc0ac"><h2 class="nw-related-title">\ube44\uc2b7\ud55c \ubd84\uc57c\uc758 \ub2e4\ub978 \uae30\uc0ac</h2><p class="nw-related-loading" role="status">\uad00\ub828 \uae30\uc0ac\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\u2026</p></section>';
    return '<div class="nw-article-detail nw-article-detail--preview">' + inner + related + '</div>';
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
            escPlain(it.title || '') +
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
    buildNwPreviewArticleInnerHtml: buildNwPreviewArticleInnerHtml,
    fetchJsonGetWithRetry: fetchJsonGetWithRetry,
    fetchRelatedArticles: fetchRelatedArticles,
    ensurePublicCategoryMap: ensurePublicCategoryMap,
    articleMainImageSrc: articleMainImageSrc,
    reporterDisplayName: reporterDisplayName,
    authorProfileHref: authorProfileHref,
    esc: esc,
    escAttr: escAttr,
  };
})(typeof window !== 'undefined' ? window : this);
