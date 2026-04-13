import { apiFetch, authHeaders, userFacingStaffListErrorMessage } from '../api/client.js';
import {
  logArticlesListResponseShape,
  normalizeArticlesListResponse,
  shouldTryStaleArticleList,
} from '../lib/articleListResponse.js';
import { ARTICLE_LIST_CACHE_STAFF, readCachedArticleList, writeCachedArticleList } from '../lib/articleListCache.js';
import { dashboardStaleBannerHtml } from '../lib/dashboardStaleBanner.js';
import { buildStaffDashboardBody, bindStaffDashboardPatchHandlers } from '../lib/staffDashboardTable.js';
import { classifyStaffListFailure } from '../lib/staffFetchErrors.js';
import { getSession, requireRole, dashboardPathForRole } from '../auth/session.js';
import { renderShell, navEditor, navAdmin, bindShell } from '../layout/shell.js';

let staffDashboardFetchSeq = 0;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function statusKo(st) {
  const x = (st || '').toLowerCase();
  if (x === 'draft') return '임시저장';
  if (x === 'submitted' || x === 'pending' || x === 'sent') return '송고·검토대기';
  if (x === 'published' || x === 'approved') return '게시·승인';
  if (x === 'rejected') return '반려';
  return st || '—';
}

/** 대시보드: 승인 여부·일반 노출 여부를 한눈에 */
function statusCellHtml(stRaw) {
  const st = (stRaw || '').toLowerCase();
  const label = statusKo(stRaw);
  let cls = 'nw-status-badge--draft';
  let hint = '비공개(메인 미노출)';
  if (st === 'published' || st === 'approved') {
    cls = 'nw-status-badge--live';
    hint = '승인됨 · 메인·공개 목록에 노출';
  } else if (st === 'submitted' || st === 'pending' || st === 'sent') {
    cls = 'nw-status-badge--review';
    hint = '편집장 승인 전 · 미노출';
  } else if (st === 'rejected') {
    cls = 'nw-status-badge--rej';
    hint = '반려됨 · 미노출';
  } else if (st === 'draft') {
    hint = '작성 중 · 미노출';
  }
  return `<div class="nw-status-cell"><span class="nw-status-badge ${cls}">${esc(label)}</span><span class="nw-status-pubhint">${esc(
    hint,
  )}</span></div>`;
}

function tryStaffCacheRender(app, navigate, mode, session, shell, fail, detailInnerHtml) {
  const cached = readCachedArticleList(ARTICLE_LIST_CACHE_STAFF);
  if (!Array.isArray(cached) || cached.length === 0) return false;
  console.info('[nw/loading-state]', JSON.stringify({ where: 'staff-dashboard', fallback: 'session-cache', rows: cached.length }));
  const banner = dashboardStaleBannerHtml({
    esc,
    fail,
    detailInnerHtml,
    retryButtonId: 'staffDashRetry',
  });
  const refetch = () => renderStaffDashboard(app, { navigate, mode });
  app.innerHTML = renderShell({
    title: shell.title,
    activePath: shell.activePath,
    navHtml: shell.nav,
    bodyHtml: banner + buildStaffDashboardBody(cached, mode, { esc, statusCellHtml }),
    underTitleHtml: shell.adminLead,
  });
  bindShell(app, { navigate });
  app.querySelector('#staffDashRetry')?.addEventListener('click', refetch);
  bindStaffDashboardPatchHandlers(app, navigate, mode, session, refetch);
  return true;
}

/**
 * @param {'editor'|'admin'} mode
 */
export async function renderStaffDashboard(app, { navigate, mode }) {
  staffDashboardFetchSeq += 1;
  const mySeq = staffDashboardFetchSeq;

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

  const adminLead =
    mode === 'admin'
      ? '<p class="nw-page-lead">송고·검토 대기 기사를 승인 또는 반려하고, 왼쪽 메뉴에서 광고를 관리할 수 있습니다.</p>'
      : '';

  const shell = { title, activePath, nav, adminLead };

  app.innerHTML = renderShell({
    title,
    activePath,
    navHtml: nav,
    bodyHtml: `<section class="nw-section"><h2>기사 목록</h2><p id="staffDashLongWait" class="nw-muted nw-dash-longwait" hidden>기사 목록을 불러오는 중입니다…</p><p class="nw-form-busy" id="staffDashLoad" aria-live="polite"><span class="nw-spinner" aria-hidden="true"></span> 목록을 불러오는 중…</p></section>`,
    underTitleHtml: adminLead,
  });
  bindShell(app, { navigate });

  const longWaitEl = app.querySelector('#staffDashLongWait');
  const longTimer = setTimeout(() => {
    if (mySeq !== staffDashboardFetchSeq) return;
    if (longWaitEl) longWaitEl.hidden = false;
  }, 700);

  let listRes;
  try {
    listRes = await apiFetch('/api/articles', { headers: authHeaders(session.token) });
  } catch (e) {
    clearTimeout(longTimer);
    if (mySeq !== staffDashboardFetchSeq) return;
    const fail = classifyStaffListFailure(null, null, e);
    console.warn('[nw/loading-state]', JSON.stringify({ where: 'staff-dashboard', category: fail?.category }));
    const msg = esc(String(e && e.message ? e.message : e));
    const detail = `<p class="nw-muted">${msg}</p>`;
    if (!tryStaffCacheRender(app, navigate, mode, session, shell, fail, detail)) {
      app.innerHTML = renderShell({
        title,
        activePath,
        navHtml: nav,
        bodyHtml: `<section class="nw-section"><h2>기사 목록</h2><p class="nw-error" role="alert">네트워크 오류로 목록을 불러오지 못했습니다. (로그인은 성공한 상태입니다)</p><p class="nw-muted">유형: ${esc(fail.category)}</p><p class="nw-muted">${msg}</p><p><button type="button" class="nw-btn" id="staffDashRetry">다시 시도</button></p></section>`,
        underTitleHtml: adminLead,
      });
      bindShell(app, { navigate });
      app.querySelector('#staffDashRetry')?.addEventListener('click', () => renderStaffDashboard(app, { navigate, mode }));
    }
    return;
  }

  clearTimeout(longTimer);
  if (mySeq !== staffDashboardFetchSeq) return;
  if (longWaitEl) longWaitEl.hidden = true;
  const loadEl0 = app.querySelector('#staffDashLoad');
  if (loadEl0) loadEl0.style.display = 'none';

  const { res, data } = listRes;
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
      underTitleHtml: adminLead,
    });
    bindShell(app, { navigate });
    return;
  }
  if (!res.ok) {
    const fail = classifyStaffListFailure(res, data, null);
    console.warn('[nw/loading-state]', JSON.stringify({ where: 'staff-dashboard', category: fail?.category, status: res.status }));
    const errText = esc(userFacingStaffListErrorMessage(data) || `HTTP ${res.status}`);
    const detail = `<p class="nw-muted">${errText}</p>`;
    if (!tryStaffCacheRender(app, navigate, mode, session, shell, fail, detail)) {
      app.innerHTML = renderShell({
        title,
        activePath,
        navHtml: nav,
        bodyHtml: `<section class="nw-section"><h2>기사 목록</h2><p class="nw-error" role="alert">서버에서 목록을 반환하지 못했습니다.</p><p class="nw-muted">유형: ${esc(fail.category)}</p><p class="nw-muted">${errText}</p><p><button type="button" class="nw-btn" id="staffDashRetry">다시 시도</button></p></section>`,
        underTitleHtml: adminLead,
      });
      bindShell(app, { navigate });
      app.querySelector('#staffDashRetry')?.addEventListener('click', () => renderStaffDashboard(app, { navigate, mode }));
    }
    return;
  }

  const listT0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const list = normalizeArticlesListResponse(data);
  const listMs =
    typeof performance !== 'undefined' ? Math.round(performance.now() - listT0) : Math.round(Date.now() - listT0);
  logArticlesListResponseShape('staff-dashboard', res, data, list, { durationMs: listMs });
  if (shouldTryStaleArticleList(res, data, list)) {
    const fail = { category: 'degraded list response', message: 'Incomplete server response.' };
    const errText = esc(userFacingStaffListErrorMessage(data) || '목록 데이터를 확인할 수 없습니다.');
    const detail = `<p class="nw-muted">${errText}</p>`;
    if (tryStaffCacheRender(app, navigate, mode, session, shell, fail, detail)) return;
  }
  if (list.length > 0) writeCachedArticleList(ARTICLE_LIST_CACHE_STAFF, list);

  const rows = list
    .map((a) => {
      const stl = (a.status || '').toLowerCase();
      const canAct = stl === 'submitted' || stl === 'pending' || stl === 'sent';
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
      <td>${statusCellHtml(a.status)}</td>
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
      <p id="staffDashBusy" class="nw-form-busy" hidden aria-live="polite">
        <span class="nw-spinner" aria-hidden="true"></span> 처리 중…
      </p>
      <div class="nw-table-wrap">
        <table class="nw-table">
          <thead>
            <tr>
              <th>번호</th><th>제목</th><th>작성자</th><th>상태 · 노출</th><th>등록일</th><th>조회수</th><th>승인/반려</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="7">기사가 없습니다.</td></tr>'}</tbody>
        </table>
      </div>
    </section>`;

  app.innerHTML = renderShell({
    title,
    activePath,
    navHtml: nav,
    bodyHtml: body,
    underTitleHtml: adminLead,
  });
  bindShell(app, { navigate });

  const busyEl = app.querySelector('#staffDashBusy');
  let actionBusy = false;

  async function patchAction(id, action) {
    if (actionBusy) return;
    actionBusy = true;
    const buttons = app.querySelectorAll('[data-appr], [data-rej]');
    buttons.forEach((b) => {
      b.disabled = true;
    });
    if (busyEl) busyEl.hidden = false;
    try {
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
      bumpMainArticleListCache();
      if (d && d.idempotent) {
        await renderStaffDashboard(app, { navigate, mode });
        return;
      }
      alert((d && d.message) || '처리되었습니다.');
      await renderStaffDashboard(app, { navigate, mode });
    } finally {
      actionBusy = false;
      if (busyEl) busyEl.hidden = true;
      app.querySelectorAll('[data-appr], [data-rej]').forEach((b) => {
        b.disabled = false;
      });
    }
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
