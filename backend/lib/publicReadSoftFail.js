/**
 * Public read APIs: soften failures when Supabase/origin is flaky.
 * Not for login or staff write paths.
 */

/** Generic delay message for public (non-auth) read paths. */
const GENERIC_DELAY_MSG =
  '\uc11c\ubc84 \uc751\ub2f5\uc774 \uc9c0\uc5f0\ub418\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';

/** 로그인·회원가입 전용 (인증 서버) */
const AUTH_UPSTREAM_USER_MSG =
  '\uc778\uc99d \uc11c\ubc84 \uc751\ub2f5\uc774 \uc9c0\uc5f0\ub418\uace0 \uc788\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';

export const NW_DEGRADED_REASON_HEADER = 'supabase-timeout';

export function isPublicReadSoftFailEnabled() {
  return String(process.env.NW_PUBLIC_READ_SOFT_FAIL || '1').trim() !== '0';
}

export function publicReadDeadlineMs() {
  const n = Number(process.env.NW_SUPABASE_READ_DEADLINE_MS);
  if (Number.isFinite(n) && n >= 2000 && n <= 120_000) return Math.floor(n);
  return 12_000;
}

export function publicSoftFailStaleMs() {
  const n = Number(process.env.NW_PUBLIC_SOFT_FAIL_STALE_MS);
  if (Number.isFinite(n) && n >= 60_000 && n <= 3_600_000) return Math.floor(n);
  return 180_000;
}

/** @param {string[]} tags */
export function upstreamPrimaryCategory(tags) {
  const order = [
    'read_deadline',
    'schema_cache',
    'postgrest',
    'db_upstream',
    'headers_timeout',
    'origin_timeout',
    'network',
    'unknown',
  ];
  for (const o of order) {
    if (tags.includes(o)) return o;
  }
  return tags[0] || 'unknown';
}

/** @param {unknown} err */
export function classifyUpstreamError(err) {
  const msg = String(err && err.message ? err.message : err);
  const low = msg.toLowerCase();
  const tags = [];
  if (/und_err_headers_timeout|headers timeout/i.test(msg)) tags.push('headers_timeout');
  if (/522|cloudflare|connection timeout|terminated due to connection timeout/i.test(low))
    tags.push('origin_timeout');
  if (/canceling statement due to statement timeout|statement timeout/i.test(low))
    tags.push('db_upstream');
  if (/schema cache|could not query the database/i.test(low)) tags.push('schema_cache');
  if (/pgrst|postgrest/i.test(low)) tags.push('postgrest');
  if (
    !tags.includes('schema_cache') &&
    !tags.includes('postgrest') &&
    /supabase.*(error|timeout)/i.test(low)
  )
    tags.push('db_upstream');
  if (/econnreset|etimedout|fetch failed|socket|network/i.test(low)) tags.push('network');
  if (err && err.code === 'NW_READ_DEADLINE') tags.push('read_deadline');
  return tags.length ? tags : ['unknown'];
}

export function isLikelyUpstreamFailure(err) {
  const tags = classifyUpstreamError(err);
  return tags.some((t) => t !== 'unknown');
}

export async function runWithReadDeadline(fn, ms) {
  const cap = ms == null ? publicReadDeadlineMs() : ms;
  if (!cap || cap < 1) return fn();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error('NW_READ_DEADLINE');
      e.code = 'NW_READ_DEADLINE';
      reject(e);
    }, cap);
    Promise.resolve()
      .then(() => fn())
      .then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        },
      );
  });
}

let _heroSnap = /** @type {{ at: number, rows: unknown[] }} | null */ (null);
let _latestSnap = /** @type {{ at: number, rows: unknown[] }} | null */ (null);
let _homeLatestMinSnap = /** @type {{ at: number, rows: unknown[] }} | null */ (null);

export function recordHeadlinesHeroSuccess(rows) {
  if (!Array.isArray(rows)) return;
  _heroSnap = { at: Date.now(), rows: rows.slice() };
}

export function recordPublicLatestSuccess(rows) {
  if (!Array.isArray(rows)) return;
  _latestSnap = { at: Date.now(), rows: rows.slice() };
}

export function recordHomeLatestMinSuccess(rows) {
  if (!Array.isArray(rows)) return;
  _homeLatestMinSnap = { at: Date.now(), rows: rows.slice() };
}

function fresh(snap) {
  if (!snap || !Array.isArray(snap.rows)) return null;
  if (Date.now() - snap.at > publicSoftFailStaleMs()) return null;
  return snap;
}

export function fallbackHeadlinesHero(limit) {
  const lim = Math.min(15, Math.max(1, Number(limit) || 5));
  const s = fresh(_heroSnap);
  if (!s) return [];
  return s.rows.slice(0, lim);
}

export function fallbackPublicLatest(limit, hero) {
  const s = fresh(_latestSnap);
  if (!s) return [];
  const lim = hero
    ? Math.min(15, Math.max(1, Number(limit) || 5))
    : Math.min(50, Math.max(1, Number(limit) || 10));
  return s.rows.slice(0, lim);
}

export function fallbackHomeLatestMin() {
  const s = fresh(_homeLatestMinSnap);
  return s ? s.rows.slice() : [];
}

/**
 * @param {string} route
 * @param {unknown} err
 * @param {Record<string, unknown>} [extra] reqId, ms, status, fallbackSource, hero, limit, bundle, …
 */
export function logPublicSoftfail(route, err, extra = {}) {
  const tags = classifyUpstreamError(err);
  const upstreamCategory = upstreamPrimaryCategory(tags);
  const reqId = extra.reqId;
  const ms = extra.ms;
  const status = extra.status != null ? extra.status : 200;
  const fallbackSource = extra.fallbackSource;
  const line = JSON.stringify({
    path: route,
    reqId,
    status,
    ms,
    degraded: true,
    fallbackSource: fallbackSource || undefined,
    upstreamCategory,
    tags,
    hero: extra.hero,
    limit: extra.limit,
    bundle: extra.bundle,
  });
  if (
    tags.includes('headers_timeout') ||
    tags.includes('origin_timeout') ||
    tags.includes('read_deadline') ||
    tags.includes('db_upstream') ||
    tags.includes('schema_cache') ||
    tags.includes('postgrest') ||
    tags.includes('network')
  ) {
    console.warn('[nw/supabase-timeout]', line);
  }
  console.warn('[nw/public-softfail]', line);
}

/**
 * Auth: reason/tags only — no raw upstream body or long error strings.
 * @param {string | undefined} reqId
 * @param {unknown} err
 * @param {Record<string, unknown>} context
 */
export function logAuthUpstreamFail(reqId, err, context = {}) {
  const tags = classifyUpstreamError(err);
  const reason = upstreamPrimaryCategory(tags);
  const { route, path, userid, ...rest } = context;
  console.error(
    '[nw/auth-upstream-fail]',
    JSON.stringify({
      reqId,
      path: route || path,
      reason,
      upstreamCategory: reason,
      tags,
      userid: userid != null ? String(userid).slice(0, 64) : undefined,
      ...rest,
    }),
  );
  if (
    tags.includes('headers_timeout') ||
    tags.includes('origin_timeout') ||
    tags.includes('read_deadline') ||
    tags.includes('network') ||
    tags.includes('db_upstream') ||
    tags.includes('schema_cache') ||
    tags.includes('postgrest')
  ) {
    console.warn(
      '[nw/supabase-timeout]',
      JSON.stringify({ reqId, context: 'auth', reason, tags }),
    );
  }
}

export function publicGenericDelayMessage() {
  return GENERIC_DELAY_MSG;
}

export function authUpstreamUserFacingError() {
  return AUTH_UPSTREAM_USER_MSG;
}

export function shouldExposeRawAuthError(message) {
  const s = String(message || '');
  if (!s) return false;
  if (s.length > 280) return false;
  if (
    /<\s*html[\s>]/i.test(s) ||
    /<\s*body[\s>]/i.test(s) ||
    /cloudflare|\b522\b|und_err_headers_timeout|headers timeout/i.test(s)
  )
    return false;
  if (/schema cache|could not query the database|pgrst|postgrest/i.test(s)) return false;
  return true;
}
