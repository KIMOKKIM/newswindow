import { apiFetch, authHeaders } from '../api/client.js';
import { getSession, requireRole, dashboardPathForRole } from '../auth/session.js';
import { renderShell, navEditor, navAdmin, bindShell } from '../layout/shell.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function statusKo(st) {
  const x = (st || '').toLowerCase();
  if (x === 'draft') return '임시저장';
  if (x === 'submitted') return '송고·검토대기';
  if (x === 'published') return '게시';
  if (x === 'rejected') return '반려';
  return st || '—';
}

/**
 * @param {'editor'|'admin'} mode
 */
export async function renderStaffDashboard(app, { navigate, mode }) {
  const session = getSession();
  const allowed = mode === 'admin' ? ['admin'] : ['editor', 'admin'];
  if (!requireRole(session, allowed)) {
    alert('편집장 또는 관리자만 접근할 수 있습니다.');
    navigate(session ? dashboardPathForRole(session.role) : '/admin');
    return;
  }

  const title = mode === 'admin' ? '관리자 대시보드' : '편집장 대시보드';
  const nav =
    mode === 'admin'
      ? navAdmin('/admin/admin/dashboard')
      : navEditor('/admin/editor/dashboard');
  const activePath =
    mode === 'admin'
      ? '/admin/admin/dashboard'
      : '/admin/editor/dashboard';

  const { res, data } = await apiFetch('/api/articles', { headers: authHeaders(session.token) });
  if (res.status === 401) {
    alert('세션이 만료되었습니다.');
    navigate(mode === 'admin' ? '/admin/admin/login' : '/admin/editor/login');
    return;
  }
  if (res.status === 403) {
    app.innerHTML = renderShell({
      title: '목록을 불러올 수 없습니다',
      activePath,
      navHtml: nav,
      bodyHtml: `<p class="nw-error">권한이 없습니다.</p>`,
    });
    bindShell(app, { navigate });
    return;
  }
  const list = Array.isArray(data) ? data : [];

  const rows = list
    .map((a) => {
      const canAct = (a.status || '').toLowerCase() === 'submitted';
      const actions =
        (canAct
          ? `<button type="button" class="nw-btn-sm nw-ok" data-appr="${a.id}">승인</button>
             <button type="button" class="nw-btn-sm nw-danger" data-rej="${a.id}">반려</button>`
          : '—') +
        ` · <a href="/admin/article/${a.id}/preview" data-link>미리보기</a>`;
      return `
    <tr>
      <td>${a.id}</td>
      <td><a href="/admin/article/${a.id}/edit" data-link>${esc(a.title || '(제목 없음)')}</a></td>
      <td>${esc(a.author_name || '')}</td>
      <td>${statusKo(a.status)}</td>
      <td>${esc((a.created_at || '').slice(0, 19))}</td>
      <td>${Number(a.views) || 0}</td>
      <td>${actions}</td>
    </tr>`;
    })
    .join('');

  const reportersBlock =
    mode === 'admin'
      ? `<section class="nw-section"><h2>기자 목록</h2><p class="nw-muted">사용자 API 연동은 추후 확장. 현재는 기사 테이블에서 작성자명을 확인하세요.</p></section>`
      : '';

  const body = `
    ${reportersBlock}
    <section class="nw-section">
      <h2>기사 목록</h2>
      <div class="nw-table-wrap">
        <table class="nw-table">
          <thead>
            <tr>
              <th>번호</th><th>제목</th><th>작성자</th><th>상태</th><th>등록일</th><th>조회수</th><th>승인/반려</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7">기사가 없습니다.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;

  const adminLead =
    mode === 'admin'
      ? '<p class="nw-page-lead">송고·검토 대기 기사를 승인 또는 반려하고, 왼쪽 메뉴에서 광고를 관리할 수 있습니다.</p>'
      : '';

  app.innerHTML = renderShell({
    title,
    activePath,
    navHtml: nav,
    bodyHtml: body,
    underTitleHtml: adminLead,
  });
  bindShell(app, { navigate });

  async function patchAction(id, action) {
    const { res, data: d } = await apiFetch('/api/articles/' + id, {
      method: 'PATCH',
      headers: authHeaders(session.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action }),
    });
    if (res.status === 401) {
      alert('세션이 만료되었습니다.');
      navigate(mode === 'admin' ? '/admin/admin/login' : '/admin/editor/login');
      return;
    }
    if (!res.ok) {
      alert((d && d.error) || '처리 실패');
      return;
    }
    alert((d && d.message) || '처리되었습니다.');
    renderStaffDashboard(app, { navigate, mode });
  }

  app.querySelectorAll('[data-appr]').forEach((btn) => {
    btn.addEventListener('click', () => patchAction(btn.getAttribute('data-appr'), 'approve'));
  });
  app.querySelectorAll('[data-rej]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('이 기사를 반려할까요?')) patchAction(btn.getAttribute('data-rej'), 'reject');
    });
  });
}
