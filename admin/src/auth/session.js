const KEY = 'nw_admin_session_v1';

export function normalizeRole(raw) {
  const s = (raw == null ? '' : String(raw)).trim().toLowerCase();
  if (s === 'editor_in_chief' || s === 'editor') return 'editor';
  if (s === 'reporter') return 'reporter';
  if (s === 'admin') return 'admin';
  return '';
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const seg = token.split('.')[1];
    if (!seg) return null;
    let b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export function jwtExpired(pl) {
  if (!pl || pl.exp == null) return false;
  return Date.now() >= Number(pl.exp) * 1000;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.token) return null;
    const pl = decodeJwtPayload(s.token);
    if (!pl || jwtExpired(pl)) {
      clearSession();
      return null;
    }
    const fromJwt = normalizeRole(pl.role);
    if (fromJwt && fromJwt !== s.role) {
      s.role = fromJwt;
      localStorage.setItem(KEY, JSON.stringify(s));
    }
    return s;
  } catch {
    return null;
  }
}

export function setSessionFromLogin(body) {
  const token =
    body?.accessToken || body?.token || body?.access_token;
  const t = token == null ? '' : String(token).trim();
  if (!t || t === 'undefined') return null;
  const pl = decodeJwtPayload(t);
  if (!pl || jwtExpired(pl)) return null;
  let rawRole = body?.role != null ? String(body.role).trim().toLowerCase() : '';
  if (!rawRole && pl.role) rawRole = String(pl.role).trim().toLowerCase();
  const role = normalizeRole(rawRole || pl.role);
  const s = {
    token: t,
    role,
    name: (body?.name || pl.name || '').toString().trim(),
    userId: body?.id != null ? body.id : pl.id != null ? pl.id : null,
  };
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** 헤더 표시용 이름만 갱신 (JWT는 그대로, /api/users/me 저장 후 호출) */
export function patchSessionDisplayName(name) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (!s || !s.token) return;
    s.name = String(name == null ? '' : name).trim();
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** 역할별 대시보드 (페이지 이동은 항상 상대 경로) */
export function dashboardPathForRole(role) {
  if (role === 'admin') return '/admin/admin/dashboard';
  if (role === 'editor') return '/admin/editor/dashboard';
  if (role === 'reporter') return '/admin/reporter/dashboard';
  return '/admin';
}

/** 스태프 포털 */
export function portalPath() {
  return '/admin';
}

/** 세션 만료 등에 쓸 역할별 로그인 경로 (상대 경로) */
export function loginPathForRole(role) {
  if (role === 'reporter') return '/admin/reporter/login';
  if (role === 'editor') return '/admin/editor/login';
  if (role === 'admin') return '/admin/admin/login';
  return '/admin';
}

export function requireSession() {
  const s = getSession();
  if (!s) return null;
  return s;
}

/** @returns {boolean} */
export function requireRole(session, allowed) {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(session.role);
}
