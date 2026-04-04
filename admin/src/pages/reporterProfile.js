import { apiFetch, authHeaders } from '../api/client.js';
import {
  getSession,
  requireRole,
  dashboardPathForRole,
  loginPathForRole,
  patchSessionDisplayName,
} from '../auth/session.js';
import { renderShell, navReporter, bindShell } from '../layout/shell.js';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function renderReporterProfile(app, { navigate }) {
  const session = getSession();
  if (!requireRole(session, 'reporter')) {
    alert('기자만 접근할 수 있습니다.');
    navigate(session ? dashboardPathForRole(session.role) : '/admin');
    return;
  }

  const { res, data } = await apiFetch('/api/users/me', {
    headers: authHeaders(session.token),
  });
  if (res.status === 401) {
    alert('세션이 만료되었습니다.');
    navigate(loginPathForRole('reporter'));
    return;
  }
  if (!res.ok) {
    const msg = data && data.error ? String(data.error) : '정보를 불러오지 못했습니다.';
    app.innerHTML = renderShell({
      title: '내 정보 수정',
      activePath: '/admin/reporter/profile',
      navHtml: navReporter('/admin/reporter/profile'),
      bodyHtml: `<p class="nw-error">${esc(msg)}</p><p><a href="/admin/reporter/dashboard" data-link>대시보드로</a></p>`,
    });
    bindShell(app, { navigate });
    return;
  }

  const body = `
    <p><a href="/admin/reporter/dashboard" data-link>← 내 기사 목록</a></p>
    <form id="fProf" class="nw-card nw-reporter-profile">
      <p class="nw-muted">아이디는 변경할 수 없습니다.</p>
      <label>아이디 <input type="text" id="userid" readonly value="${esc(data.userid)}" /></label>
      <label>이름 <span class="nw-req">*</span> <input type="text" id="name" required value="${esc(data.name)}" /></label>
      <label>이메일 <span class="nw-req">*</span> <input type="email" id="email" required value="${esc(data.email)}" /></label>
      <label>주민번호 <input type="text" id="ssn" value="${esc(data.ssn)}" autocomplete="off" /></label>
      <label>전화번호 <input type="tel" id="phone" value="${esc(data.phone)}" /></label>
      <label>주소 <textarea id="address" rows="2">${esc(data.address)}</textarea></label>
      <label>새 비밀번호 (변경 시에만 입력) <input type="password" id="pw1" autocomplete="new-password" /></label>
      <label>새 비밀번호 확인 <input type="password" id="pw2" autocomplete="new-password" /></label>
      <p id="err" class="nw-error" style="display:none" role="alert"></p>
      <button type="submit" class="nw-btn nw-btn-primary">저장</button>
    </form>`;

  app.innerHTML = renderShell({
    title: '내 정보 수정',
    activePath: '/admin/reporter/profile',
    navHtml: navReporter('/admin/reporter/profile'),
    bodyHtml: body,
  });
  bindShell(app, { navigate });

  const form = app.querySelector('#fProf');
  const errEl = app.querySelector('#err');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    errEl.textContent = '';

    const name = app.querySelector('#name').value.trim();
    const email = app.querySelector('#email').value.trim();
    if (!name || !email) {
      errEl.textContent = '이름과 이메일은 필수입니다.';
      errEl.style.display = 'block';
      return;
    }

    const p1 = app.querySelector('#pw1').value;
    const p2 = app.querySelector('#pw2').value;
    if (p1 || p2) {
      if (p1 !== p2) {
        errEl.textContent = '새 비밀번호가 일치하지 않습니다.';
        errEl.style.display = 'block';
        return;
      }
      if (p1.length < 6) {
        errEl.textContent = '비밀번호는 6자 이상으로 입력해 주세요.';
        errEl.style.display = 'block';
        return;
      }
    }

    const payload = {
      name,
      email,
      ssn: app.querySelector('#ssn').value.trim(),
      phone: app.querySelector('#phone').value.trim(),
      address: app.querySelector('#address').value.trim(),
    };
    if (p1) payload.password = p1;

    const { res: saveRes, data: saveData } = await apiFetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        ...authHeaders(session.token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (saveRes.status === 401) {
      alert('세션이 만료되었습니다.');
      navigate(loginPathForRole('reporter'));
      return;
    }

    if (!saveRes.ok) {
      errEl.textContent =
        saveData && saveData.error ? String(saveData.error) : '저장에 실패했습니다.';
      errEl.style.display = 'block';
      return;
    }

    patchSessionDisplayName(name);
    alert('저장되었습니다.');
    navigate('/admin/reporter/dashboard');
  });
}
