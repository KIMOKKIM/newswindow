/**
 * Shared article preview markup for admin preview and public article.html.
 * Inject categoryLabelForValue etc. from articleMetaFormat (admin) or site scripts (public).
 */
export function buildNwPreviewArticleInnerHtml(a, deps, options) {
  const { esc, escAttr, categoryLabelForValue, reporterDisplayName, formatArticleMetaDateYmd } = deps;
  const opts = options || {};
  const toolbarHtml = opts.toolbarHtml || '';
  const resolveImgSrc = opts.resolveImgSrc || ((src) => escAttr(String(src == null ? '' : src)));
  const includeNwCard = opts.includeNwCard !== false;
  const wrapClass = 'nw-preview-article' + (includeNwCard ? ' nw-card' : '');

  const catShown = categoryLabelForValue(a.category || '') || '—';
  const byline =
    reporterDisplayName(a.author_name) +
    ' · 발행일 ' +
    formatArticleMetaDateYmd(a.published_at || a.created_at) +
    ' · 수정일 ' +
    formatArticleMetaDateYmd(a.updated_at || a.created_at);

  let blocks = '';
  for (const n of [1, 2, 3, 4]) {
    const src = a['image' + n];
    const cap = a['image' + n + '_caption'];
    const cx = a['content' + n];
    if (cx) {
      blocks +=
        '<div class="nw-prev-body">' + esc(cx).replace(/\n/g, '<br/>') + '</div>';
    }
    if (src) {
      blocks +=
        '<figure class="nw-prev-fig"><img src="' +
        resolveImgSrc(src) +
        '" alt="" class="nw-prev-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/logo-header-tight.png\'"/></figure>';
    }
    if (cap) blocks += '<p class="nw-prev-cap">' + esc(cap) + '</p>';
  }
  const fallbackBody = (a.content || '').trim();
  if (!blocks && fallbackBody) {
    blocks =
      '<div class="nw-prev-body">' +
      esc(fallbackBody).replace(/\n/g, '<br/>') +
      '</div>';
  }

  const metaBar =
    '<div class="nw-prev-meta-bar">' +
    '<span class="nw-prev-meta-cat">' +
    esc(catShown) +
    '</span>' +
    '<span class="nw-prev-meta-byline">' +
    esc(byline) +
    '</span></div>';

  return (
    toolbarHtml +
    '<article class="' +
    wrapClass +
    '">' +
    '<h2 class="nw-prev-title" id="nwArticleDetailTitle">' +
    esc(a.title || '(제목 없음)') +
    '</h2>' +
    (a.subtitle ? '<p class="nw-prev-sub">' + esc(a.subtitle) + '</p>' : '') +
    metaBar +
    '<div class="nw-prev-content">' +
    (blocks || '<p class="nw-muted">본문 없음</p>') +
    '</div>' +
    '<p class="nw-prev-legal">\uc800\uc791\uad8c\uc790 \xa9 \ub274\uc2a4\uc758\ucc3d \ubb34\ub2e8\uc804\uc7ac \ubc0f \uc7ac\ubc30\ud3ec \uae08\uc9c0</p>' +
    '</article>'
  );
}
