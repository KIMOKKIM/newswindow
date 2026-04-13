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

/** 메인(script.js)과 동일: Vercel에서 VITE_API_ORIGIN 없이 빌드돼도 www에서 Render API로 접속 */
function runtimeProdApiOrigin() {
  try {
    const h = String(typeof location !== 'undefined' ? location.hostname : '').toLowerCase();
    if (h === 'www.newswindow.kr' || h === 'newswindow.kr') {
      return 'https://newswindow-backend.onrender.com';
    }
  } catch {
    /* ignore */
  }
  return '';
}

const API_ORIGIN = normalizeApiOrigin(import.meta.env.VITE_API_ORIGIN) || runtimeProdApiOrigin();

/** 기본 타임아웃(ms). Render cold start·슬립 대비 */
const DEFAULT_TIMEOUT_MS = (() => {
  const n = Number(import.meta.env.VITE_API_TIMEOUT_MS);
  if (Number.isFinite(n) && n >= 3000 && n <= 120000) return Math.floor(n);
  return 20000;
})();

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : '/' + path;
  if (!API_ORIGIN) return p;
  return API_ORIGIN + p;
}

/**
 * GET: timeout + 실패 시 1회 재시도(Abort/네트워크). POST/PATCH 등: 재시도 없음.
 * 응답 헤더 X-Request-Id 는 콘솔 [nw/apiFetch]에 출력.
 */
export async function apiFetch(path, opts = {}) {
  const url = apiUrl(path);
  const method = String(opts.method || 'GET').toUpperCase();
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const allowRetry = method === 'GET' && opts.retry !== false;

  async function doOnce(isRetry) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (ctrl) ctrl.abort();
    }, timeoutMs);
    const headers = { Accept: 'application/json', ...opts.headers };
    const cache = opts.cache != null ? opts.cache : 'no-store';
    const { cache: _c, timeoutMs: _t, retry: _r, ...rest } = opts;
    try {
      const res = await fetch(url, {
        ...rest,
        method: opts.method || 'GET',
        cache,
        headers,
        signal: ctrl ? ctrl.signal : undefined,
      });
      clearTimeout(timer);
      const text = await res.text().catch(() => '');
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { _raw: text };
      }
      const rid = res.headers.get('X-Request-Id');
      if (rid && typeof console !== 'undefined' && console.info) {
        console.info('[nw/apiFetch]', path, 'X-Request-Id:', rid, isRetry ? '(retry)' : '');
      }
      return { res, data, text };
    } catch (err) {
      clearTimeout(timer);
      if (allowRetry && !isRetry && (err.name === 'AbortError' || err.name === 'TypeError')) {
        return doOnce(true);
      }
      throw err;
    }
  }

  return doOnce(false);
}

export function authHeaders(token, extra = {}) {
  return { Authorization: 'Bearer ' + token, ...extra };
}

/** Matches backend authUpstreamUserFacingError — never show PostgREST/HTML/522 to users. */
const AUTH_GENERIC_DELAY =
  '\uc778\uc99d \uc11c\ubc84 \uc751\ub2f5\uc774 \uc9c0\uc5f0\ub418\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';

const STAFF_LIST_GENERIC =
  '\uc77c\uc2dc\uc801\uc73c\ub85c \ubaa9\ub85d\uc744 \ubd88\ub7ec\uc62c \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ub85c\uadf8\uc778\uc740 \uc720\uc9c0\ub418\uc5b4 \uc788\uc73c\ub2c8 \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';

function looksLikeUpstreamLeak(t) {
  if (!t || typeof t !== 'string') return true;
  const s = t.trim();
  if (!s) return true;
  if (/<\s*html[\s>]/i.test(s) || /<\s*body[\s>]/i.test(s) || s.length > 400) return true;
  if (
    /cloudflare|\b522\b|connection timed out|headers timeout|und_err|fetch failed|stack:/i.test(s) ||
    /schema cache|could not query the database|for the schema|retrying\.?$/im.test(s) ||
    /pgrst|postgrest|postgresterror/i.test(s)
  )
    return true;
  return false;
}

function responseHasUpstreamLeak(data) {
  if (!data || typeof data !== 'object') return false;
  for (const k of ['error', 'message', 'detail', 'description', 'hint', 'details']) {
    const v = data[k];
    if (typeof v === 'string' && looksLikeUpstreamLeak(v)) return true;
  }
  const raw = data._raw;
  if (typeof raw === 'string' && raw && looksLikeUpstreamLeak(raw)) return true;
  return false;
}

/**
 * @param {unknown} data Parsed JSON from apiFetch (may include _raw on parse failure)
 * @param {Error|unknown} [networkErr] Set when fetch threw (timeout, CORS, etc.)
 */
export function userFacingAuthErrorMessage(data, networkErr) {
  if (networkErr != null) return AUTH_GENERIC_DELAY;
  if (!data || typeof data !== 'object') return AUTH_GENERIC_DELAY;
  if (responseHasUpstreamLeak(data)) return AUTH_GENERIC_DELAY;
  const e = data.error;
  if (typeof e === 'string' && e.trim() && !looksLikeUpstreamLeak(e)) return e.trim();
  return AUTH_GENERIC_DELAY;
}

/**
 * Staff dashboard list errors: keep login vs list failure separate; never show raw upstream HTML.
 * @param {unknown} data
 */
export function userFacingStaffListErrorMessage(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) return STAFF_LIST_GENERIC;
  const e = data.error;
  if (typeof e === 'string' && e.trim() && !looksLikeUpstreamLeak(e)) return e.trim();
  if (data._raw && typeof data._raw === 'string' && /<\s*html[\s>]/i.test(data._raw)) return STAFF_LIST_GENERIC;
  return STAFF_LIST_GENERIC;
}
