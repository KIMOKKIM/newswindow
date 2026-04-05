/**
 * 뉴스의창 스태프 단일 인증/세션 모듈
 * - 세션: localStorage nw_session JSON { token, role, name, userId }
 * - role 정규화: reporter | editor | admin (JWT/DB의 editor_in_chief → editor)
 * - ?role= 은 로그인 페이지 안내용만; 인증 판정에는 사용하지 않음
 */
(function (global) {
  const SESSION_KEY = 'nw_session';
  const LEGACY = { token: 'accessToken', role: 'role', name: 'name' };

  const NW_DEBUG =
    typeof location !== 'undefined' &&
    (/(\?|&)nwdebug=1(?:&|$)/.test(location.search) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('nwOfficeDebug') === '1'));

  function authLog() {
    if (NW_DEBUG) console.log.apply(console, ['[auth]'].concat([].slice.call(arguments)));
  }

  function decodeJwt(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const seg = token.split('.')[1];
      if (!seg) return null;
      let b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const payload = JSON.parse(atob(b64));
      return payload && typeof payload === 'object' ? payload : null;
    } catch (e) {
      return null;
    }
  }

  function jwtExpired(payload) {
    if (!payload || payload.exp == null) return false;
    return Date.now() >= Number(payload.exp) * 1000;
  }

  /** 서버/ JWT 원문 role → UI/가드용 canonical */
  function toCanonicalRole(raw) {
    const s = raw == null ? '' : String(raw).trim().toLowerCase();
    if (s === 'editor_in_chief' || s === 'editor') return 'editor';
    if (s === 'reporter') return 'reporter';
    if (s === 'admin') return 'admin';
    return '';
  }

  function pickTokenFromBody(d) {
    if (!d || typeof d !== 'object') return '';
    const c =
      d.accessToken !== undefined && d.accessToken !== null
        ? d.accessToken
        : d.token !== undefined && d.token !== null
          ? d.token
          : d.access_token;
    const s = c == null ? '' : String(c).trim();
    if (!s || s === 'undefined') return '';
    return s;
  }

  function persistSession(session) {
    const s = {
      token: String(session.token || ''),
      role: String(session.role || ''),
      name: session.name != null ? String(session.name) : '',
      userId: session.userId != null ? session.userId : null,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      authLog('session persisted', { role: s.role, userId: s.userId });
    } catch (e) {
      authLog('session persist error', e);
      throw e;
    }
  }

  function removeLegacyKeys() {
    try {
      localStorage.removeItem(LEGACY.token);
      localStorage.removeItem(LEGACY.role);
      localStorage.removeItem(LEGACY.name);
    } catch (e) {}
  }

  function migrateLegacySession() {
    try {
      const token = localStorage.getItem(LEGACY.token);
      if (!token) return null;
      const pl = decodeJwt(token);
      if (!pl || jwtExpired(pl)) {
        removeLegacyKeys();
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch (e2) {}
        return null;
      }
      const session = {
        token,
        role: toCanonicalRole(pl.role),
        name: (localStorage.getItem(LEGACY.name) || pl.name || '').toString().trim(),
        userId: pl.id != null ? pl.id : null,
      };
      if (!session.role) session.role = toCanonicalRole(localStorage.getItem(LEGACY.role));
      persistSession(session);
      removeLegacyKeys();
      authLog('migrated legacy localStorage → nw_session');
      return session;
    } catch (e) {
      return null;
    }
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (!s || typeof s !== 'object' || !s.token) return migrateLegacySession() || null;
        const pl = decodeJwt(s.token);
        if (!pl || jwtExpired(pl)) {
          authLog('session invalid: jwt missing or expired, clear');
          clearSession();
          return null;
        }
        const fromJwt = toCanonicalRole(pl.role);
        if (fromJwt && fromJwt !== s.role) {
          authLog('role normalized from jwt', { was: s.role, now: fromJwt });
          s.role = fromJwt;
          if (pl.name && !s.name) s.name = String(pl.name);
          if (pl.id != null && s.userId == null) s.userId = pl.id;
          persistSession(s);
        }
        if (!s.role && fromJwt) {
          s.role = fromJwt;
          persistSession(s);
        }
        authLog('session loaded', { role: s.role, hasToken: true });
        return s;
      }
    } catch (e) {
      authLog('getSession parse error', e);
    }
    return migrateLegacySession();
  }

  function clearSession(reason) {
    if (NW_DEBUG) authLog('clearSession', reason || '');
    try {
      localStorage.removeItem(SESSION_KEY);
      removeLegacyKeys();
    } catch (e) {}
  }

  /**
   * 로그인 API 성공 응답 body로 세션 저장 (login.html 전용)
   * @returns {object|null} session or null
   */
  function setSessionFromLogin(body) {
    const token = pickTokenFromBody(body);
    if (!token) return null;
    const pl = decodeJwt(token);
    if (!pl || jwtExpired(pl)) return null;
    let raw =
      body && body.role != null && String(body.role).trim() !== ''
        ? String(body.role).trim().toLowerCase()
        : '';
    if (!raw && pl.role) raw = String(pl.role).trim().toLowerCase();
    const canonical = toCanonicalRole(raw || pl.role);
    const session = {
      token,
      role: canonical,
      name:
        (body && body.name != null && String(body.name).trim()
          ? String(body.name).trim()
          : pl.name
            ? String(pl.name).trim()
            : '') || '',
      userId: body && body.id != null ? body.id : pl.id != null ? pl.id : null,
    };
    persistSession(session);
    removeLegacyKeys();
    authLog('setSessionFromLogin', { role: session.role, userId: session.userId });
    return session;
  }

  function hydrateSessionFromToken() {
    return getSession();
  }

  function patchSession(partial) {
    const s = getSession();
    if (!s) return null;
    if (partial.name != null) s.name = String(partial.name);
    if (partial.userId != null) s.userId = partial.userId;
    persistSession(s);
    return s;
  }

  function loginQueryParamForCanonical(canonical) {
    if (canonical === 'editor') return 'editor_in_chief';
    if (canonical === 'reporter') return 'reporter';
    if (canonical === 'admin') return 'admin';
    return '';
  }

  function loginPageUrl(loginQueryRole) {
    const r = (loginQueryRole || '').trim();
    if (r === 'reporter') return '/admin/reporter/login';
    if (r === 'editor_in_chief' || r === 'editor') return '/admin/editor/login';
    if (r === 'admin') return '/admin/admin/login';
    return '/admin';
  }

  function redirectToLogin(opts) {
    opts = opts || {};
    const reason = opts.reason || 'no_session';
    const hint = opts.loginQueryRole || '';
    authLog('redirect reason', reason, 'target', loginPageUrl(hint));
    const url = loginPageUrl(hint);
    global.location.replace(url);
  }

  /**
   * 세션 필수. 없으면 로그인으로 이동하고 null (이후 코드 실행은 브라우저가 중단할 수 있음)
   */
  function requireAuth(opts) {
    const s = getSession();
    if (!s || !s.token) {
      authLog('requireAuth fail');
      redirectToLogin(opts || {});
      return null;
    }
    authLog('requireAuth pass', { role: s.role });
    return s;
  }

  /**
   * @param {string|string[]} allowed canonical: 'reporter' | 'editor' | 'admin'
   */
  function requireRole(allowed, opts) {
    const list = Array.isArray(allowed) ? allowed : [allowed];
    const s = requireAuth(opts);
    if (!s) return null;
    if (list.indexOf(s.role) === -1) {
      authLog('requireRole fail', { need: list, have: s.role });
      alert('이 페이지에 접근할 권한이 없습니다.');
      global.location.replace('/admin');
      return null;
    }
    authLog('requireRole pass', { role: s.role });
    return s;
  }

  function dashboardPathForRole(canonical) {
    if (canonical === 'admin') return '/admin/admin/dashboard';
    if (canonical === 'editor') return '/admin/editor/dashboard';
    if (canonical === 'reporter') return '/admin/reporter/dashboard';
    return '/admin';
  }

  function authHeaders(session, extra) {
    const tok = session && session.token ? session.token : '';
    return Object.assign({ Authorization: 'Bearer ' + tok, Accept: 'application/json' }, extra || {});
  }

  /** 401 전역 처리: 세션 제거 후 로그인 (API 만료/무효) */
  function onUnauthorized(message, loginQueryRole) {
    clearSession('401_unauthorized');
    if (message) alert(message);
    redirectToLogin({ reason: '401', loginQueryRole: loginQueryRole || '' });
  }

  /**
   * 기사 상세 fetch 결과: 인증 실패만 로그인 이동. 그 외(403/404/500)는 false 반환 → 호출부에서 메시지
   */
  function detailFetchNeedsLoginRedirect(result) {
    return !!(result && !result.ok && result.err && result.err.kind === 'auth');
  }

  function applyDetailAuthFailure(result, opts) {
    if (!detailFetchNeedsLoginRedirect(result)) return false;
    authLog('[article] detail → auth (401)', { status: result.status });
    if (opts && typeof opts.beforeRedirect === 'function') opts.beforeRedirect();
    onUnauthorized(result.err && result.err.msg, opts && opts.loginQueryRole);
    return true;
  }

  global.NwAuth = {
    NW_DEBUG: NW_DEBUG,
    SESSION_KEY: SESSION_KEY,
    getSession: getSession,
    setSessionFromLogin: setSessionFromLogin,
    hydrateSessionFromToken: hydrateSessionFromToken,
    clearSession: clearSession,
    patchSession: patchSession,
    toCanonicalRole: toCanonicalRole,
    requireAuth: requireAuth,
    requireRole: requireRole,
    redirectToLogin: redirectToLogin,
    loginPageUrl: loginPageUrl,
    loginQueryParamForCanonical: loginQueryParamForCanonical,
    dashboardPathForRole: dashboardPathForRole,
    authHeaders: authHeaders,
    onUnauthorized: onUnauthorized,
    detailFetchNeedsLoginRedirect: detailFetchNeedsLoginRedirect,
    applyDetailAuthFailure: applyDetailAuthFailure,
    decodeJwt: decodeJwt,
  };
})(typeof window !== 'undefined' ? window : this);
