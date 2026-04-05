import { apiFetch, authHeaders } from '../api/client.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
  portalPath,
  loginPathForRole,
} from '../auth/session.js';
import {
  renderShell,
  navReporter,
  navEditor,
  navAdmin,
  bindShell,
} from '../layout/shell.js';
import { categoryLabelForValue } from '../data/categories.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

function navFor(session, activePath) {
  if (session.role === 'reporter') return navReporter(activePath);
  if (session.role === 'admin') return navAdmin(activePath);
  return navEditor(activePath);
}

function dashPath(session) {
  return dashboardPathForRole(session.role);
}

export async function renderArticlePreview(app, { navigate, articleId }) {
  const session = getSession();
  if (!requireRole(session, ['reporter', 'editor', 'admin'])) {
    alert('권한이 없습니다.');
    navigate(session ? dashboardPathForRole(session.role) : portalPath());
    return;
  }

  const { res, data } = await apiFetch('/api/articles/' + articleId, {
    headers: authHeaders(session.token),
  });
  if (res.status === 401) {
    alert('세션이 만료되었습니다.');
    navigate(loginPathForRole(session.role));
    return;
  }
  if (res.status === 403) {
    alert('이 기사를 열람할 권한이 없습니다.');
    navigate(dashPath(session));
    return;
  }
  if (res.status === 404) {
    alert('기사를 찾을 수 없습니다.');
    navigate(dashPath(session));
    return;
  }

  if (Array.isArray(data)) {
    console.error('[articlePreview] expected object, got array (check /api/articles proxy path)');
    alert('기사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    navigate(dashPath(session));
    return;
  }

  const a = data && data.article ? data.article : data;
  const activePath = '/admin/article/' + articleId + '/preview';

  function reporterDisplayName(name) {
    const n = String(name || '').trim();
    if (!n) return '기자';
    if (/기자\s*$/.test(n)) return n;
    return n + ' 기자';
  }

  function formatDateYmd(iso) {
    if (!iso) return '—';
    const s = String(iso).replace(' ', 'T');
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10) || '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  const catShown = categoryLabelForValue(a.category || '') || '—';
  const byline =
    reporterDisplayName(a.author_name) +
    ' · 발행일 ' +
    formatDateYmd(a.published_at || a.created_at) +
    ' · 수정일 ' +
    formatDateYmd(a.updated_at || a.created_at);

  let blocks = '';
  for (const n of [1, 2, 3, 4]) {
    const src = a['image' + n];
    const cap = a['image' + n + '_caption'];
    const cx = a['content' + n];
    if (cx)
      blocks +=
        '<div class="nw-prev-body">' +
        esc(cx).replace(/\n/g, '<br/>') +
        '</div>';
    if (src)
      blocks +=
        '<figure class="nw-prev-fig"><img src="' +
        escAttr(src) +
        '" alt="" class="nw-prev-img"/></figure>';
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

  const body = `
    <p class="nw-toolbar">
      <a href="${dashPath(session)}" data-link>← 목록</a>
      · <a href="/admin/article/${articleId}/edit" data-link>수정</a>
    </p>
    <article class="nw-preview-article nw-card">
      <h2 class="nw-prev-title">${esc(a.title || '(제목 없음)')}</h2>
      ${
        a.subtitle
          ? '<p class="nw-prev-sub">' + esc(a.subtitle) + '</p>'
          : ''
      }
      ${metaBar}
      <div class="nw-prev-content">${blocks || '<p class="nw-muted">본문 없음</p>'}</div>
      <p class="nw-prev-legal">저작권자 © 뉴스의창 무단전재 및 재배포 금지</p>
    </article>`;

  app.innerHTML = renderShell({
    title: '미리보기 · 기사 ' + articleId,
    activePath,
    navHtml: navFor(session, activePath),
    bodyHtml: body,
  });
  bindShell(app, { navigate });
}
