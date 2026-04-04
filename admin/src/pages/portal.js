/**
 * /admin 역할 선택 포털 (운영 진입점)
 */
import { getSession, dashboardPathForRole } from '../auth/session.js';
import { renderShell, GUEST_ROLE_PORTAL, bindShell } from '../layout/shell.js';

function roleKo(role) {
  if (role === 'admin') return '관리자';
  if (role === 'editor') return '편집장';
  if (role === 'reporter') return '기자';
  return '';
}

export async function renderPortal(app, { navigate }) {
  const session = getSession();
  const sessionStrip = session
    ? `<p class="nw-portal-session">현재 <strong>${roleKo(session.role)}</strong> 계정으로 로그인되어 있습니다.
         <a href="${dashboardPathForRole(session.role)}" data-link>내 대시보드</a></p>`
    : '';

  const cards = `
    <div class="nw-portal nw-portal--embedded">
      <div class="nw-portal-inner">
        ${sessionStrip}
        <h1 class="nw-portal-title">뉴스의창 스태프</h1>
        <p class="nw-portal-desc">기자, 편집장, 관리자 전용 페이지입니다.</p>
        <div class="nw-portal-cards">
          <article class="nw-portal-card">
            <h2>기자</h2>
            <p class="nw-portal-card-desc">기사 작성 및 제보</p>
            <div class="nw-portal-actions">
              <a href="/admin/reporter/login" class="nw-btn nw-btn-primary" data-link>로그인</a>
              <a href="/admin/reporter/signup" class="nw-btn" data-link>회원가입</a>
            </div>
          </article>
          <article class="nw-portal-card">
            <h2>편집장</h2>
            <p class="nw-portal-card-desc">기사 승인 및 편집</p>
            <div class="nw-portal-actions">
              <a href="/admin/editor/login" class="nw-btn nw-btn-primary" data-link>로그인</a>
              <a href="/admin/editor/signup" class="nw-btn" data-link>회원가입</a>
            </div>
          </article>
          <article class="nw-portal-card">
            <h2>관리자</h2>
            <p class="nw-portal-card-desc">시스템 및 사용자 관리</p>
            <div class="nw-portal-actions">
              <a href="/admin/admin/login" class="nw-btn nw-btn-primary" data-link>로그인</a>
            </div>
          </article>
        </div>
      </div>
    </div>`;

  app.innerHTML = renderShell({
    title: '',
    activePath: '/admin',
    navHtml: '',
    bodyHtml: cards,
    guestRoleLabel: session ? '' : GUEST_ROLE_PORTAL,
  });
  bindShell(app, { navigate });
}
