/**
 * VITE_API_ORIGIN: 빌드 시 점검 (예: https://newswindow-backend.onrender.com)
 * - 동일 오리진 /api 프록시가 실패할 때 직접 백엔드 호출. 비우면 상대 경로 /api (브라우저 현재 origin).
 * - 값 끝의 /api 는 자동 제거 (경로는 항상 /api/... 로 통일).
 */
function normalizeApiOrigin(raw) {
  let s = String(raw == null ? '' : raw).trim().replace(/\/+$/, '');
  if (!s) return '';
  if (s.toLowerCase().endsWith('/api')) s = s.slice(0, -4).replace(/\/+$/, '');
  return s;
}

const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_ORIGIN);

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : '/' + path;
  if (!API_ORIGIN) return p;
  return API_ORIGIN + p;
}

/** Vite dev: proxy /api — 운영: 동일 오리진 또는 VITE_API_ORIGIN */
export async function apiFetch(path, opts = {}) {
  const url = apiUrl(path);
  const headers = { Accept: 'application/json', ...opts.headers };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text().catch(() => '');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { res, data, text };
}

export function authHeaders(token, extra = {}) {
  return { Authorization: 'Bearer ' + token, ...extra };
}
