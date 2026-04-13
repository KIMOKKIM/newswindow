import {
  apiFetch,
  API_ARTICLES_LIST_TIMEOUT_MS,
  authHeaders,
  userFacingStaffListErrorMessage,
} from '../api/client.js';
import {
  logArticlesListResponseShape,
  normalizeArticlesListResponse,
  shouldTryStaleArticleList,
} from '../lib/articleListResponse.js';
import { ARTICLE_LIST_CACHE_REPORTER, readCachedArticleList, writeCachedArticleList } from '../lib/articleListCache.js';
import { classifyStaffListFailure } from '../lib/staffFetchErrors.js';
import { dashboardStaleBannerHtml } from '../lib/dashboardStaleBanner.js';
import { buildReporterDashboardBody } from '../lib/reporterDashboardTable.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
  loginPathForRole,
} from '../auth/session.js';
import { renderShell, navReporter, bindShell } from '../layout/shell.js';

let reporterDashboardFetchSeq = 0;

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

function reporterStatusCell(stRaw) {
  const st = (stRaw || '').toLowerCase();
  const hint =
    st === 'published' || st === 'approved'
      ? '메인 공개됨'
      : '메인 미공개 · 편집장 승인 후 노출';
  let cls = 'nw-status-badge--draft';
  if (st === 'published' || st === 'approved') cls = 'nw-status-badge--live';
  else if (st === 'submitted' || st === 'pending' || st === 'sent') cls = 'nw-status-badge--review';
  else if (st === 'rejected') cls = 'nw-status-badge--rej';
  return `<div class="nw-status-cell"><span class="nw-status-badge ${cls}">${esc(
    statusKo(stRaw),
  )}</span><span class="nw-status-pubhint">${esc(hint)}</span></div>`;
}

function tryReporterCacheRender(app, navigate, fail, detailInnerHtml) {
  const cached = readCachedArticleList(ARTICLE_LIST_CACHE_REPORTER);
  if (!Array.isArray(cached) || cached.length === 0) return false;
  console.info('[nw/loading-state]', JSON.stringify({ where: 'reporter-dashboard', fallback: 'session-cache', rows: cached.length }));
  const banner = dashboardStaleBannerHtml({
    esc,
    fail,
    detailInnerHtml,
    retryButtonId: 'reporterDashRetry',
  });
  const refetch = () => renderReporter(app, { navigate });
  app.innerHTML = renderShell({
    title: '기자 대시보드',
    activePath: '/admin/reporter/dashboard',
    navHtml: navReporter('/admin/reporter/dashboard'),
    bodyHtml: banner + buildReporterDashboardBody(cached, { esc, reporterStatusCell }),
  });
  bindShell(app, { navigate });
  app.querySelector('#reporterDashRetry')?.addEventListener('click', refetch);
  return true;
}

export async function renderReporter(app, { navigate }) {
  reporterDashboardFetchSeq += 1;
  const mySeq = reporterDashboardFetchSeq;

  const session = getSession();
  if (!requireRole(session, 'reporter')) {
    alert('기자만 접근할 수 있습니다.');
    navigate(session ? dashboardPathForRole(session.role) : '/admin');
    return;
  }

  app.innerHTML = renderShell({
    title: '기자 대시보드',
    activePath: '/admin/reporter/dashboard',
    navHtml: navReporter('/admin/reporter/dashboard'),
    bodyHtml: `<section class="nw-section"><h2>내 기사</h2><p id="reporterDashLongWait" class="nw-muted nw-dash-longwait" hidden>기사 목록을 불러오는 중입니다…</p><p class="nw-form-busy" id="reporterDashLoad" aria-live="polite"><span class="nw-spinner" aria-hidden="true"></span> 목록을 불러오는 중…</p></section>`,
  });
  bindShell(app, { navigate });

  const longWaitEl = app.querySelector('#reporterDashLongWait');
  const longTimer = setTimeout(() => {
    if (mySeq !== reporterDashboardFetchSeq) return;
    if (longWaitEl) longWaitEl.hidden = false;
  }, 700);

  let listRes;
  try {
    listRes = await apiFetch('/api/articles', {
      headers: authHeaders(session.token),
      timeoutMs: API_ARTICLES_LIST_TIMEOUT_MS,
    });
  } catch (e) {
    clearTimeout(longTimer);
    if (mySeq !== reporterDashboardFetchSeq) return;
    const fail = classifyStaffListFailure(null, null, e);
    console.warn('[nw/loading-state]', JSON.stringify({ where: 'reporter-dashboard', category: fail?.category }));
    const msg = esc(String(e && e.message ? e.message : e));
    const detail = `<p class="nw-muted">${msg}</p>`;
    if (!tryReporterCacheRender(app, navigate, fail, detail)) {
      app.innerHTML = renderShell({
        title: '기자 대시보드',
        activePath: '/admin/reporter/dashboard',
        navHtml: navReporter('/admin/reporter/dashboard'),
        bodyHtml: `<section class="nw-section"><h2>내 기사</h2><p class="nw-error" role="alert">네트워크 오류로 목록을 불러오지 못했습니다.</p><p class="nw-muted">유형: ${esc(fail.category)}</p><p class="nw-muted">${msg}</p><p><button type="button" class="nw-btn" id="reporterDashRetry">다시 시도</button></p></section>`,
      });
      bindShell(app, { navigate });
      app.querySelector('#reporterDashRetry')?.addEventListener('click', () => renderReporter(app, { navigate }));
    }
    return;
  }

  clearTimeout(longTimer);
  if (mySeq !== reporterDashboardFetchSeq) return;
  if (longWaitEl) longWaitEl.hidden = true;
  const loadEl0 = app.querySelector('#reporterDashLoad');
  if (loadEl0) loadEl0.style.display = 'none';

  const { res, data } = listRes;
  if (res.status === 401) {
    alert('세션이 만료되었습니다.');
    navigate(loginPathForRole('reporter'));
    return;
  }
  if (res.status === 403) {
    app.innerHTML = renderShell({
      title: '목록을 불러올 수 없습니다',
      activePath: '/admin/reporter/dashboard',
      navHtml: navReporter('/admin/reporter/dashboard'),
      bodyHtml: `<p class="nw-error">권한이 없습니다.</p>`,
    });
    bindShell(app, { navigate });
    return;
  }
  if (!res.ok) {
    const fail = classifyStaffListFailure(res, data, null);
    console.warn('[nw/loading-state]', JSON.stringify({ where: 'reporter-dashboard', category: fail?.category, status: res.status }));
    const errText = esc(userFacingStaffListErrorMessage(data) || `HTTP ${res.status}`);
    const detail = `<p class="nw-muted">${errText}</p>`;
    if (!tryReporterCacheRender(app, navigate, fail, detail)) {
      app.innerHTML = renderShell({
        title: '기자 대시보드',
        activePath: '/admin/reporter/dashboard',
        navHtml: navReporter('/admin/reporter/dashboard'),
        bodyHtml: `<section class="nw-section"><h2>내 기사</h2><p class="nw-error" role="alert">서버에서 목록을 반환하지 못했습니다.</p><p class="nw-muted">유형: ${esc(fail.category)}</p><p class="nw-muted">${errText}</p><p><button type="button" class="nw-btn" id="reporterDashRetry">다시 시도</button></p></section>`,
      });
      bindShell(app, { navigate });
      app.querySelector('#reporterDashRetry')?.addEventListener('click', () => renderReporter(app, { navigate }));
    }
    return;
  }

  const listT0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const list = normalizeArticlesListResponse(data);
  const listMs =
    typeof performance !== 'undefined' ? Math.round(performance.now() - listT0) : Math.round(Date.now() - listT0);
  logArticlesListResponseShape('reporter-dashboard', res, data, list, { durationMs: listMs });
  if (shouldTryStaleArticleList(res, data, list)) {
    const fail = { category: 'degraded list response', message: 'Incomplete server response.' };
    const errText = esc(userFacingStaffListErrorMessage(data) || '목록 데이터를 확인할 수 없습니다.');
    const detail = `<p class="nw-muted">${errText}</p>`;
    if (tryReporterCacheRender(app, navigate, fail, detail)) return;
  }
  if (list.length > 0) writeCachedArticleList(ARTICLE_LIST_CACHE_REPORTER, list);

  app.innerHTML = renderShell({
    title: '기자 대시보드',
    activePath: '/admin/reporter/dashboard',
    navHtml: navReporter('/admin/reporter/dashboard'),
    bodyHtml: buildReporterDashboardBody(list, { esc, reporterStatusCell }),
  });
  bindShell(app, { navigate });
}
