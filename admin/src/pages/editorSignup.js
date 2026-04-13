import { apiFetch, userFacingAuthErrorMessage } from '../api/client.js';
import { getSession, dashboardPathForRole } from '../auth/session.js';
import { renderShell, GUEST_ROLE_EDITOR, bindShell } from '../layout/shell.js';

export async function renderEditorSignup(app, { navigate }) {
  const session = getSession();
  if (session && session.role === 'editor') {
    navigate(dashboardPathForRole(session.role), { replace: true });
    return;
  }

  const body = `
    <div class="nw-login-wrap">
      <p class="nw-muted">역할은 편집장으로 자동 등록됩니다.</p>
      <form id="fSu" class="nw-card">
        <label>아이디 * <input type="text" id="userid" required autocomplete="username" /></label>
        <label>비밀번호 * <input type="password" id="pw1" required autocomplete="new-password" /></label>
        <label>비밀번호 확인 * <input type="password" id="pw2" required autocomplete="new-password" /></label>
        <label>이름 * <input type="text" id="name" required /></label>
        <label>이메일 * <input type="email" id="email" required /></label>
        <p id="err" class="nw-error" style="display:none;"></p>
        <button type="submit" class="nw-btn nw-btn-primary">회원가입</button>
        <p class="nw-hint"><a href="/admin/editor/login" data-link>이미 계정이 있으신가요? 로그인</a></p>
      </form>
    </div>`;

  app.innerHTML = renderShell({
    title: '편집장 회원가입',
    activePath: '/admin/editor/signup',
    navHtml: '',
    bodyHtml: body,
    guestRoleLabel: GUEST_ROLE_EDITOR,
  });
  bindShell(app, { navigate });
  const go = typeof navigate === 'function' ? navigate : () => {};

  app.querySelector('#fSu').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    err.style.display = 'none';
    const userid = app.querySelector('#userid').value.trim();
    const pw1 = app.querySelector('#pw1').value;
    const pw2 = app.querySelector('#pw2').value;
    if (pw1 !== pw2) {
      err.textContent = '비밀번호가 일치하지 않습니다.';
      err.style.display = 'block';
      return;
    }
    const body = {
      userid,
      password: pw1,
      name: app.querySelector('#name').value.trim(),
      email: app.querySelector('#email').value.trim(),
      role: 'editor_in_chief',
      ssn: '',
      phone: '',
      address: '',
    };
    const { res, data } = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      err.textContent = userFacingAuthErrorMessage(data, null);
      err.style.display = 'block';
      return;
    }
    alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    go('/admin/editor/login', { replace: true });
  });
}
