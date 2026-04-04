import { apiFetch, authHeaders } from '../api/client.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
  loginPathForRole,
} from '../auth/session.js';
import { renderShell, navReporter, bindShell } from '../layout/shell.js';

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

export async function renderReporter(app, { navigate }) {
  const session = getSession();
  if (!requireRole(session, 'reporter')) {
    alert('기자만 접근할 수 있습니다.');
    navigate(session ? dashboardPathForRole(session.role) : '/admin');
    return;
  }
  const { res, data } = await apiFetch('/api/articles', { headers: authHeaders(session.token) });
  if (res.status === 401) {
    alert('세션이 만료되었습니다.');
    navigate(loginPathForRole('reporter'));
    return;
  }
  const list = Array.isArray(data) ? data : [];

  const rows = list
    .map(
      (a) => `
    <tr>
      <td>${a.id}</td>
      <td><a href="/admin/article/${a.id}/edit" data-link>${esc(a.title || '(제목 없음)')}</a></td>
      <td>${statusKo(a.status)}</td>
      <td>${esc(a.category || '')}</td>
      <td>${esc((a.created_at || '').slice(0, 19))}</td>
      <td>${esc((a.updated_at || '').slice(0, 19))}</td>
      <td>${Number(a.views) || 0}</td>
      <td>
        <a href="/admin/article/${a.id}/edit" data-link>수정</a>
        · <a href="/admin/article/${a.id}/preview" data-link>미리보기</a>
      </td>
    </tr>`
    )
    .join('');

  const body = `
    <div class="nw-toolbar">
      <a href="/admin/article/new" class="nw-btn nw-btn-primary" data-link>기사 작성</a>
      <a href="/admin/reporter/profile" class="nw-btn" data-link>정보 수정</a>
    </div>
    <div class="nw-table-wrap">
      <table class="nw-table">
        <thead>
          <tr>
            <th>번호</th><th>제목</th><th>상태</th><th>카테고리</th>
            <th>등록일</th><th>수정일</th><th>조회수</th><th>액션</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="8">기사가 없습니다.</td></tr>'}</tbody>
      </table>
    </div>`;

  app.innerHTML = renderShell({
    title: '기자 대시보드',
    activePath: '/admin/reporter/dashboard',
    navHtml: navReporter('/admin/reporter/dashboard'),
    bodyHtml: body,
  });
  bindShell(app, { navigate });
}
