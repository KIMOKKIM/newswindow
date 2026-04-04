import { clearSession, getSession } from '../auth/session.js';

export const GUEST_ROLE_PORTAL = '스태프 포털';
export const GUEST_ROLE_REPORTER = '기자';
export const GUEST_ROLE_EDITOR = '편집장';
export const GUEST_ROLE_ADMIN = '관리자';

function roleLabelFromSession(role) {
  if (role === 'admin') return '관리자';
  if (role === 'editor') return '편집장';
  if (role === 'reporter') return '기자';
  return '';
}

/**
 * @param {{
 *   title?: string,
 *   activePath?: string,
 *   navHtml?: string,
 *   bodyHtml: string,
 *   guestRoleLabel?: string,
 *   underTitleHtml?: string,
 * }} opts
 */
export function renderShell({
  title,
  activePath,
  navHtml = '',
  bodyHtml,
  guestRoleLabel = '',
  underTitleHtml = '',
}) {
  const session = getSession();
  let roleBadge = '';
  if (session) {
    const rl = roleLabelFromSession(session.role);
    roleBadge = escape(rl + (session.name ? ' · ' + session.name : ''));
  } else if (guestRoleLabel) {
    roleBadge = escape(guestRoleLabel);
  }

  return `
  <div class="nw-admin">
    <header class="nw-admin-header" role="banner">
      <div class="nw-admin-header-left">
        <span class="nw-service-name">뉴스의창</span>
        ${
          roleBadge
            ? `<span class="nw-admin-role-badge" aria-label="현재 역할">${roleBadge}</span>`
            : ''
        }
      </div>
      <div class="nw-admin-header-actions">
        <button type="button" class="nw-btn nw-btn-ghost nw-btn-header" id="btnShellPortal">
          스태프 초기화면
        </button>
        ${
          session
            ? `<button type="button" class="nw-btn nw-btn-header" id="btnLogout">로그아웃</button>`
            : ''
        }
      </div>
    </header>
    <div class="nw-admin-layout ${navHtml ? '' : 'nw-admin-layout--single'}">
      ${navHtml ? `<aside class="nw-admin-nav" aria-label="섹션 메뉴">${navHtml}</aside>` : ''}
      <main class="nw-admin-main">
        ${title ? `<h1 class="nw-page-title">${escape(title)}</h1>${underTitleHtml || ''}` : ''}
        ${bodyHtml}
      </main>
    </div>
  </div>`;
}

function articleEditLike(p) {
  return /\/admin\/article\/\d+\/edit$/.test(p || '');
}

function articlePreviewLike(p) {
  return /\/admin\/article\/\d+\/preview$/.test(p || '');
}

export function navReporter(activePath) {
  const ap = activePath || '';
  const profileOn = ap === '/admin/reporter/profile';
  const listOn =
    !profileOn &&
    (ap === '/admin/reporter/dashboard' ||
      articleEditLike(ap) ||
      articlePreviewLike(ap));
  const newOn =
    !profileOn && (ap === '/admin/article/new' || articleEditLike(ap));
  return `
    <a href="/admin/reporter/dashboard" class="nw-nav ${listOn ? 'active' : ''}" data-link>내 기사 목록</a>
    <a href="/admin/article/new" class="nw-nav ${newOn ? 'active' : ''}" data-link>기사 작성</a>
    <a href="/admin/reporter/profile" class="nw-nav ${profileOn ? 'active' : ''}" data-link>정보 수정</a>
  `;
}

export function navEditor(activePath) {
  const ap = activePath || '';
  const on =
    ap === '/admin/editor/dashboard' ||
    articleEditLike(ap) ||
    articlePreviewLike(ap);
  return `
    <a href="/admin/editor/dashboard" class="nw-nav ${on ? 'active' : ''}" data-link>송고·전체 기사</a>
  `;
}

export function navAdmin(activePath) {
  const ap = activePath || '';
  const dashOn =
    ap === '/admin/admin/dashboard' ||
    articleEditLike(ap) ||
    articlePreviewLike(ap);
  const adsOn = ap === '/admin/ads';
  return `
    <a href="/admin/admin/dashboard" class="nw-nav ${dashOn ? 'active' : ''}" data-link>전체 기사</a>
    <a href="/admin/ads" class="nw-nav ${adsOn ? 'active' : ''}" data-link>광고 관리</a>
    <span class="nw-nav muted">사용자 관리(예정)</span>
  `;
}

export function bindShell(root, { navigate } = {}) {
  const go = typeof navigate === 'function' ? navigate : () => {};
  root.querySelectorAll('[data-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      go(href);
    });
  });
  root.querySelector('#btnShellPortal')?.addEventListener('click', () => {
    go('/admin');
  });
  const lo = root.querySelector('#btnLogout');
  if (lo) {
    lo.addEventListener('click', () => {
      clearSession();
      go('/admin', { replace: true });
    });
  }
}

function escape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
