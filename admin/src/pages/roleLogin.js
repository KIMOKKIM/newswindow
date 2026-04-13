import { apiFetch, userFacingAuthErrorMessage } from '../api/client.js';
import {
  setSessionFromLogin,
  dashboardPathForRole,
  getSession,
  clearSession,
} from '../auth/session.js';
import {
  renderShell,
  GUEST_ROLE_REPORTER,
  GUEST_ROLE_EDITOR,
  GUEST_ROLE_ADMIN,
  bindShell,
} from '../layout/shell.js';

const TITLES = {
  reporter: '기자 로그인',
  editor: '편집장 로그인',
  admin: '관리자 로그인',
};

const GUEST_BADGE = {
  reporter: GUEST_ROLE_REPORTER,
  editor: GUEST_ROLE_EDITOR,
  admin: GUEST_ROLE_ADMIN,
};

/**
 * @param {'reporter'|'editor'|'admin'} expectedRole
 */
export async function renderRoleLogin(app, { navigate, expectedRole }) {
  const session = getSession();
  if (session && session.role === expectedRole) {
    navigate(dashboardPathForRole(session.role), { replace: true });
    return;
  }

  const title = TITLES[expectedRole] || '로그인';
  const formHtml = `
    <div class="nw-login-wrap">
      <form id="fLogin" class="nw-card">
        <label>아이디 <input type="text" id="uid" required autocomplete="username" /></label>
        <label>비밀번호 <input type="password" id="pw" required autocomplete="current-password" /></label>
        <p id="err" class="nw-error" style="display:none;"></p>
        ${
          session && session.role !== expectedRole
            ? `<p class="nw-warn">다른 역할로 로그인된 상태입니다. 아래에서 로그인하면 이 기기 세션이 교체됩니다.</p>`
            : ''
        }
        <button type="submit" class="nw-btn nw-btn-primary">로그인</button>
      </form>
    </div>`;

  app.innerHTML = renderShell({
    title,
    activePath: `/admin/${expectedRole === 'admin' ? 'admin' : expectedRole}/login`,
    navHtml: '',
    bodyHtml: formHtml,
    guestRoleLabel: GUEST_BADGE[expectedRole],
  });

  const go = typeof navigate === 'function' ? navigate : () => {};
  bindShell(app, { navigate });

  app.querySelector('#fLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    err.style.display = 'none';
    const userid = app.querySelector('#uid').value.trim();
    const password = app.querySelector('#pw').value;
    let res;
    let data;
    try {
      const out = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password }),
      });
      res = out.res;
      data = out.data;
    } catch (networkErr) {
      err.textContent = userFacingAuthErrorMessage(null, networkErr);
      err.style.display = 'block';
      return;
    }
    if (!res.ok) {
      err.textContent = userFacingAuthErrorMessage(data, null);
      err.style.display = 'block';
      return;
    }
    const nextSession = setSessionFromLogin(data || {});
    if (!nextSession) {
      err.textContent = '세션을 만들 수 없습니다.';
      err.style.display = 'block';
      return;
    }
    if (nextSession.role !== expectedRole) {
      clearSession();
      err.textContent =
        '이 계정은 이 로그인 화면과 맞지 않습니다. 역할에 맞는 로그인 메뉴를 이용해 주세요.';
      err.style.display = 'block';
      return;
    }
    go(dashboardPathForRole(nextSession.role), { replace: true });
  });
}
