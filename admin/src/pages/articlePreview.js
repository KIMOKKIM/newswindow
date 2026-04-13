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
import {
  categoryLabelForValue,
  reporterDisplayName,
  formatArticleMetaDateYmd,
} from '../../../shared/articleMetaFormat.js';
import { buildNwPreviewArticleInnerHtml } from '../../../shared/nwArticlePreviewBuild.core.js';

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
    alert('\uad8c\ud55c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.');
    navigate(session ? dashboardPathForRole(session.role) : portalPath());
    return;
  }

  const { res, data } = await apiFetch('/api/articles/' + articleId, {
    headers: authHeaders(session.token),
  });
  if (res.status === 401) {
    alert('\uc138\uc158\uc774 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
    navigate(loginPathForRole(session.role));
    return;
  }
  if (res.status === 403) {
    alert('\uc774 \uae30\uc0ac\ub97c \uc5f4\ub78c\ud560 \uad8c\ud55c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.');
    navigate(dashPath(session));
    return;
  }
  if (res.status === 404) {
    alert('\uae30\uc0ac\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.');
    navigate(dashPath(session));
    return;
  }

  if (Array.isArray(data)) {
    console.error('[articlePreview] expected object, got array (check /api/articles proxy path)');
    alert('\uae30\uc0ac \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.');
    navigate(dashPath(session));
    return;
  }

  const a = data && data.article ? data.article : data;
  const activePath = '/admin/article/' + articleId + '/preview';

  const toolbarHtml = `<p class="nw-toolbar">
      <a href="${dashPath(session)}" data-link>← 목록</a>
      · <a href="/admin/article/${articleId}/edit" data-link>수정</a>
    </p>`;

  const body = buildNwPreviewArticleInnerHtml(
    a,
    {
      esc,
      escAttr,
      categoryLabelForValue,
      reporterDisplayName,
      formatArticleMetaDateYmd,
    },
    {
      toolbarHtml,
      resolveImgSrc: (src) => escAttr(src),
    }
  );

  app.innerHTML = renderShell({
    title: '미리보기 · 기사 ' + articleId,
    activePath,
    navHtml: navFor(session, activePath),
    bodyHtml: body,
  });
  bindShell(app, { navigate });
}
