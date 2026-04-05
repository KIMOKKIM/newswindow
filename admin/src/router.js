import { getSession, dashboardPathForRole } from './auth/session.js';
import { renderShell, bindShell, GUEST_ROLE_PORTAL } from './layout/shell.js';
import { renderPortal } from './pages/portal.js';
import { renderRoleLogin } from './pages/roleLogin.js';
import { renderReporterSignup } from './pages/reporterSignup.js';
import { renderEditorSignup } from './pages/editorSignup.js';
import { renderReporter } from './pages/reporter.js';
import { renderReporterProfile } from './pages/reporterProfile.js';
import { renderStaffDashboard } from './pages/staffDashboard.js';
import { renderArticleForm } from './pages/articleForm.js';
import { renderArticlePreview } from './pages/articlePreview.js';
import { renderAds } from './pages/ads.js';

/** 레거시 단축 경로 → 대시보드 */
const LEGACY_REDIRECTS = {
  '/admin/reporter': '/admin/reporter/dashboard',
  '/admin/editor': '/admin/editor/dashboard',
  '/admin/admin': '/admin/admin/dashboard',
};

/** @param {string} pathname */
export function matchRoute(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/admin';
  if (p === '/admin') return { name: 'portal' };

  if (p === '/admin/reporter/login') return { name: 'reporterLogin' };
  if (p === '/admin/reporter/signup') return { name: 'reporterSignup' };
  if (p === '/admin/reporter/dashboard') return { name: 'reporterDashboard' };
  if (p === '/admin/reporter/profile') return { name: 'reporterProfile' };

  if (p === '/admin/editor/login') return { name: 'editorLogin' };
  if (p === '/admin/editor/signup') return { name: 'editorSignup' };
  if (p === '/admin/editor/dashboard') return { name: 'editorDashboard' };

  if (p === '/admin/admin/login') return { name: 'adminLogin' };
  if (p === '/admin/admin/dashboard') return { name: 'adminDashboard' };

  if (p === '/admin/ads') return { name: 'ads' };
  if (p === '/admin/article/new') return { name: 'articleNew' };
  let m = p.match(/^\/admin\/article\/(\d+)\/edit$/);
  if (m) return { name: 'articleEdit', id: m[1] };
  m = p.match(/^\/admin\/article\/(\d+)\/preview$/);
  if (m) return { name: 'articlePreview', id: m[1] };

  return { name: 'notFound' };
}

function isPublicRoute(name) {
  return (
    name === 'portal' ||
    name === 'reporterLogin' ||
    name === 'reporterSignup' ||
    name === 'editorLogin' ||
    name === 'editorSignup' ||
    name === 'adminLogin'
  );
}

/**
 * @param {HTMLElement} root
 * @param {string} path — pathname (+ optional search)
 * @param {{ replace?: boolean }} [opts]
 */
export function navigate(root, path, opts = {}) {
  const url = new URL(path, window.location.origin);
  const next = url.pathname + url.search;
  if (opts.replace) window.history.replaceState(null, '', next);
  else window.history.pushState(null, '', next);
  return renderPath(root, next);
}

async function renderPathCore(root, fullPath) {
  const url = new URL(fullPath, window.location.origin);
  let pathname = url.pathname.replace(/\/+$/, '') || '/admin';

  if (pathname === '/admin/login') {
    navigate(root, '/admin' + url.search, { replace: true });
    return;
  }

  const leg = LEGACY_REDIRECTS[pathname];
  if (leg) {
    navigate(root, leg + url.search, { replace: true });
    return;
  }

  const route = matchRoute(pathname);
  const nav = (to, o) => navigate(root, to, o);
  const session = getSession();

  if (route.name === 'portal') {
    /* 세션이 있어도 URL은 /admin 에 둠 — 이전에는 여기서 dashboardPathForRole 로 즉시 치환되어 관리자가 /admin/admin/dashboard 로만 진입했음 */
    await renderPortal(root, { navigate: nav });
    return;
  }

  if (route.name === 'reporterLogin') {
    await renderRoleLogin(root, { navigate: nav, expectedRole: 'reporter' });
    return;
  }
  if (route.name === 'editorLogin') {
    await renderRoleLogin(root, { navigate: nav, expectedRole: 'editor' });
    return;
  }
  if (route.name === 'adminLogin') {
    await renderRoleLogin(root, { navigate: nav, expectedRole: 'admin' });
    return;
  }

  if (route.name === 'reporterSignup') {
    await renderReporterSignup(root, { navigate: nav });
    return;
  }
  if (route.name === 'editorSignup') {
    await renderEditorSignup(root, { navigate: nav });
    return;
  }

  if (!session && !isPublicRoute(route.name)) {
    await nav('/admin', { replace: true });
    return;
  }

  switch (route.name) {
    case 'reporterDashboard':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (session.role !== 'reporter') {
        await nav(dashboardPathForRole(session.role), { replace: true });
        return;
      }
      await renderReporter(root, { navigate: nav });
      break;

    case 'reporterProfile':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (session.role !== 'reporter') {
        await nav(dashboardPathForRole(session.role), { replace: true });
        return;
      }
      await renderReporterProfile(root, { navigate: nav });
      break;

    case 'editorDashboard':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (session.role === 'admin') {
        await nav('/admin/admin/dashboard', { replace: true });
        return;
      }
      if (session.role !== 'editor') {
        await nav(dashboardPathForRole(session.role), { replace: true });
        return;
      }
      await renderStaffDashboard(root, { navigate: nav, mode: 'editor' });
      break;

    case 'adminDashboard':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (session.role === 'editor') {
        await nav('/admin/editor/dashboard', { replace: true });
        return;
      }
      if (session.role !== 'admin') {
        await nav(dashboardPathForRole(session.role), { replace: true });
        return;
      }
      await renderStaffDashboard(root, { navigate: nav, mode: 'admin' });
      break;

    case 'ads':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (session.role !== 'admin') {
        await nav(dashboardPathForRole(session.role), { replace: true });
        return;
      }
      await renderAds(root, { navigate: nav });
      break;

    case 'articleNew':
    case 'articleEdit':
    case 'articlePreview':
      if (!session) {
        await nav('/admin', { replace: true });
        return;
      }
      if (route.name === 'articleNew')
        await renderArticleForm(root, { navigate: nav, articleId: null });
      else if (route.name === 'articleEdit')
        await renderArticleForm(root, { navigate: nav, articleId: route.id });
      else await renderArticlePreview(root, { navigate: nav, articleId: route.id });
      break;

    default:
      root.innerHTML = renderShell({
        title: '페이지를 찾을 수 없습니다',
        activePath: pathname,
        navHtml: '',
        bodyHtml: `<p>요청한 주소에 해당하는 화면이 없습니다.</p><p><a href="/admin" data-link>스태프 포털로 이동</a></p>`,
        guestRoleLabel: session ? '' : GUEST_ROLE_PORTAL,
      });
      bindShell(root, { navigate: nav });
  }
}

async function renderPath(root, fullPath) {
  try {
    await renderPathCore(root, fullPath);
  } catch (err) {
    console.error('renderPath', err);
    const nav = (to, o) => navigate(root, to, o);
    root.innerHTML = renderShell({
      title: '오류',
      activePath: '',
      navHtml: '',
      bodyHtml:
        '<p class="nw-error">화면을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p><p><a href="/admin" data-link>스태프 포털</a></p>',
      guestRoleLabel: GUEST_ROLE_PORTAL,
    });
    bindShell(root, { navigate: nav });
  }
}

export function initRouter(root) {
  window.addEventListener('popstate', () => {
    void renderPath(root, window.location.pathname + window.location.search);
  });
  document.body.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const a = t.closest('a[href^="/admin"]');
    if (a && !a.hasAttribute('data-link')) {
      const href = a.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      navigate(root, href);
    }
  });
  void renderPath(root, window.location.pathname + window.location.search);
}
