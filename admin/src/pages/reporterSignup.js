import { apiFetch, userFacingAuthErrorMessage } from '../api/client.js';
import { getSession, dashboardPathForRole } from '../auth/session.js';
import { renderShell, GUEST_ROLE_REPORTER, bindShell } from '../layout/shell.js';

const DAUM_POSTCODE_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

function loadDaumPostcodeScript() {
  if (typeof window !== 'undefined' && window.daum?.Postcode) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-daumpostcode]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('주소 검색 스크립트 로드 실패'))
      );
      return;
    }
    const s = document.createElement('script');
    s.src = DAUM_POSTCODE_SRC;
    s.async = true;
    s.setAttribute('data-daumpostcode', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('주소 검색 스크립트 로드 실패'));
    document.head.appendChild(s);
  });
}

function openKakaoAddressSearch(onComplete) {
  if (!window.daum?.Postcode) {
    alert('주소 검색을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.');
    return;
  }
  new window.daum.Postcode({
    oncomplete(data) {
      onComplete({
        zonecode: data.zonecode || '',
        roadAddress: data.roadAddress || data.autoRoadAddress || '',
        jibunAddress: data.jibunAddress || data.autoJibunAddress || '',
      });
    },
    width: '100%',
    height: '100%',
  }).open();
}

function passwordMeetsPolicy(pw) {
  if (!pw || pw.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasLetter && hasDigit && hasSpecial;
}

function buildEmail(app) {
  const local = app.querySelector('#emailLocal').value.trim();
  const sel = app.querySelector('#emailDomain').value;
  let domain = sel;
  if (sel === '__custom') {
    domain = app.querySelector('#emailDomainCustom').value.trim();
  }
  if (!local || !domain) return '';
  return local + '@' + domain;
}

export async function renderReporterSignup(app, { navigate }) {
  const session = getSession();
  if (session && session.role === 'reporter') {
    navigate(dashboardPathForRole(session.role), { replace: true });
    return;
  }

  const body = `
    <div class="nw-reporter-signup">
      <p class="nw-muted nw-reporter-signup-note">역할은 기자로 자동 등록됩니다.</p>
      <form id="fSu" class="nw-card nw-reporter-signup-card">
        <div class="nw-form-row">
          <label for="userid">아이디</label>
          <div class="nw-id-row">
            <input type="text" id="userid" name="userid" required autocomplete="username" placeholder="아이디 입력" />
            <button type="button" class="nw-signup-action-btn" id="btnChk" style="background-color:#4a5568;color:#ffffff;border:1px solid #3d4758;-webkit-text-fill-color:#ffffff;">중복확인</button>
          </div>
          <p id="chkMsg" class="nw-chk-msg nw-muted"></p>
        </div>
        <div class="nw-form-row">
          <label for="pw1">비밀번호</label>
          <input type="password" id="pw1" required autocomplete="new-password" placeholder="비밀번호 입력" />
          <p class="nw-field-hint">영문, 특수문자, 숫자 사용 8자 이상</p>
        </div>
        <div class="nw-form-row">
          <label for="pw2">비밀번호확인</label>
          <input type="password" id="pw2" required autocomplete="new-password" placeholder="비밀번호 확인" />
        </div>
        <div class="nw-form-row">
          <label for="name">이름</label>
          <input type="text" id="name" required placeholder="이름" />
        </div>
        <div class="nw-form-row">
          <label>이메일</label>
          <div class="nw-email-row">
            <input type="text" id="emailLocal" required inputmode="email" autocomplete="email" placeholder="이메일 아이디" />
            <span class="nw-email-at">@</span>
            <select id="emailDomain" class="nw-email-domain" required>
              <option value="">도메인 선택</option>
              <option value="gmail.com">gmail.com</option>
              <option value="naver.com">naver.com</option>
              <option value="daum.net">daum.net</option>
              <option value="hanmail.net">hanmail.net</option>
              <option value="nate.com">nate.com</option>
              <option value="kakao.com">kakao.com</option>
              <option value="__custom">직접입력</option>
            </select>
          </div>
          <div id="emailDomainCustomWrap" class="nw-email-custom-wrap" style="display:none;">
            <input type="text" id="emailDomainCustom" placeholder="예: company.co.kr" autocomplete="off" />
          </div>
        </div>
        <div class="nw-form-row">
          <label>주민번호</label>
          <div class="nw-ssn-row">
            <input type="text" id="ssn1" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="앞 6자리" />
            <span class="nw-ssn-sep">-</span>
            <input type="text" id="ssn2" inputmode="numeric" maxlength="7" autocomplete="off" placeholder="뒤 7자리" />
          </div>
        </div>
        <div class="nw-form-row">
          <label for="phone">전화번호</label>
          <input type="tel" id="phone" required placeholder="010-0000-0000" />
        </div>
        <div class="nw-form-row">
          <label>주소</label>
          <div class="nw-addr-zip-row">
            <input type="text" id="zipcode" readonly placeholder="우편번호" class="nw-input-readonly" />
            <button type="button" class="nw-signup-action-btn" id="btnAddrSearch" style="background-color:#4a5568;color:#ffffff;border:1px solid #3d4758;-webkit-text-fill-color:#ffffff;">찾기</button>
          </div>
          <input type="text" id="addrRoad" readonly placeholder="기본주소" class="nw-input-readonly nw-addr-road" />
        </div>
        <div class="nw-form-row">
          <label for="addrDetail">상세주소</label>
          <input type="text" id="addrDetail" placeholder="상세주소 입력 (동, 호수 등)" autocomplete="street-address" />
        </div>
        <p id="err" class="nw-error" style="display:none;"></p>
        <button type="submit" class="nw-btn nw-btn-primary nw-btn-signup-submit">회원가입</button>
        <p class="nw-hint nw-signup-footer-back"><a href="/admin/reporter/login" data-link>이미 계정이 있으신가요? 로그인</a></p>
        <p class="nw-signup-footer-portal"><a href="/admin" data-link>← 스태프 선택으로 돌아가기</a></p>
      </form>
    </div>`;

  app.innerHTML = renderShell({
    title: '기자 회원가입',
    activePath: '/admin/reporter/signup',
    navHtml: '',
    bodyHtml: body,
    guestRoleLabel: GUEST_ROLE_REPORTER,
  });
  bindShell(app, { navigate });
  const go = typeof navigate === 'function' ? navigate : () => {};

  loadDaumPostcodeScript().catch(() => {});

  const domainSel = app.querySelector('#emailDomain');
  const customWrap = app.querySelector('#emailDomainCustomWrap');
  domainSel.addEventListener('change', () => {
    if (domainSel.value === '__custom') {
      customWrap.style.display = 'block';
      app.querySelector('#emailDomainCustom').required = true;
    } else {
      customWrap.style.display = 'none';
      app.querySelector('#emailDomainCustom').required = false;
    }
  });

  let useridChecked = false;
  let lastCheckedUserid = '';
  let useridCheckTimer = null;

  async function performUseridDupCheck() {
    const uid = app.querySelector('#userid').value.trim();
    const msg = app.querySelector('#chkMsg');
    msg.textContent = '';
    msg.className = 'nw-chk-msg nw-muted';
    if (!uid) {
      msg.textContent = '아이디를 입력하세요.';
      useridChecked = false;
      lastCheckedUserid = '';
      return;
    }
    if (uid.length < 2) {
      msg.textContent = '아이디를 2글자 이상 입력해 주세요.';
      useridChecked = false;
      lastCheckedUserid = '';
      return;
    }
    msg.textContent = '확인 중…';
    msg.className = 'nw-chk-msg nw-muted';
    const { res, data } = await apiFetch(
      '/api/users/check?' + new URLSearchParams({ userid: uid }).toString()
    );
    if (!res.ok) {
      msg.textContent = userFacingAuthErrorMessage(data, null);
      msg.className = 'nw-chk-msg nw-error';
      useridChecked = false;
      lastCheckedUserid = '';
      return;
    }
    useridChecked = !!data.available;
    lastCheckedUserid = uid;
    msg.textContent = data.available
      ? '사용 가능한 아이디입니다.'
      : '이미 사용 중인 아이디입니다.';
    msg.className = data.available ? 'nw-chk-msg nw-ok-text' : 'nw-chk-msg nw-error';
  }

  app.querySelector('#btnChk').addEventListener('click', () => {
    clearTimeout(useridCheckTimer);
    useridCheckTimer = null;
    performUseridDupCheck();
  });

  app.querySelector('#userid').addEventListener('input', () => {
    useridChecked = false;
    lastCheckedUserid = '';
    const m = app.querySelector('#chkMsg');
    m.textContent = '';
    m.className = 'nw-chk-msg nw-muted';
    clearTimeout(useridCheckTimer);
    useridCheckTimer = window.setTimeout(() => {
      performUseridDupCheck();
    }, 450);
  });

  app.querySelector('#userid').addEventListener('blur', () => {
    clearTimeout(useridCheckTimer);
    useridCheckTimer = null;
    const uid = app.querySelector('#userid').value.trim();
    if (uid && uid === lastCheckedUserid && useridChecked) return;
    if (uid) performUseridDupCheck();
  });

  app.querySelector('#btnAddrSearch').addEventListener('click', async () => {
    try {
      await loadDaumPostcodeScript();
      openKakaoAddressSearch(({ zonecode, roadAddress, jibunAddress }) => {
        app.querySelector('#zipcode').value = zonecode;
        const line = roadAddress || jibunAddress || '';
        app.querySelector('#addrRoad').value = line;
      });
    } catch (e) {
      alert(
        (e && e.message) ||
          '카카오 주소 검색을 불러오지 못했습니다. 네트워크를 확인해 주세요.'
      );
    }
  });

  app.querySelector('#fSu').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = app.querySelector('#err');
    err.style.display = 'none';
    const userid = app.querySelector('#userid').value.trim();
    const pw1 = app.querySelector('#pw1').value;
    const pw2 = app.querySelector('#pw2').value;
    if (!useridChecked || userid !== lastCheckedUserid) {
      err.textContent = '아이디 중복확인을 완료해 주세요.';
      err.style.display = 'block';
      return;
    }
    if (!passwordMeetsPolicy(pw1)) {
      err.textContent =
        '비밀번호는 영문, 숫자, 특수문자를 모두 포함해 8자 이상이어야 합니다.';
      err.style.display = 'block';
      return;
    }
    if (pw1 !== pw2) {
      err.textContent = '비밀번호가 일치하지 않습니다.';
      err.style.display = 'block';
      return;
    }
    const email = buildEmail(app);
    if (!email) {
      err.textContent = '이메일을 올바르게 입력해 주세요.';
      err.style.display = 'block';
      return;
    }
    const s1 = app.querySelector('#ssn1').value.replace(/\D/g, '');
    const s2 = app.querySelector('#ssn2').value.replace(/\D/g, '');
    if (s1.length !== 6 || s2.length !== 7) {
      err.textContent = '주민번호 앞 6자리·뒤 7자리를 입력해 주세요.';
      err.style.display = 'block';
      return;
    }
    const zip = app.querySelector('#zipcode').value.trim();
    const road = app.querySelector('#addrRoad').value.trim();
    const detail = app.querySelector('#addrDetail').value.trim();
    if (!zip || !road) {
      err.textContent = '주소 찾기로 우편번호와 기본주소를 입력해 주세요.';
      err.style.display = 'block';
      return;
    }
    if (!detail) {
      err.textContent = '상세주소를 입력해 주세요.';
      err.style.display = 'block';
      return;
    }
    const addressFull = '[' + zip + '] ' + road + (detail ? ', ' + detail : '');

    const payload = {
      userid,
      password: pw1,
      name: app.querySelector('#name').value.trim(),
      email,
      role: 'reporter',
      ssn: s1 + '-' + s2,
      phone: app.querySelector('#phone').value.trim(),
      address: addressFull,
    };
    const { res, data } = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      err.textContent = userFacingAuthErrorMessage(data, null);
      err.style.display = 'block';
      return;
    }
    alert('회원가입이 완료되었습니다. 로그인해 주세요.');
    go('/admin/reporter/login', { replace: true });
  });
}
