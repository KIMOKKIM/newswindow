/**
 * Optional duplicate-request coalescing only (TTL capped at 1s when enabled).
 * Default: off. Full home/list JSON always (emergency ultra-min payloads disabled in code).
 * NW_EMERGENCY_API_CACHE_MS: 0 = off (default unset). If set > 0, effective TTL = min(value, 1000).
 */

const _cache = new Map();
const MAX_SHIELD_TTL_MS = 1000;

export function emergencyShieldTtlMs() {
  const n = Number(process.env.NW_EMERGENCY_API_CACHE_MS);
  if (Number.isFinite(n) && n === 0) return 0;
  if (Number.isFinite(n) && n > 0) return Math.min(MAX_SHIELD_TTL_MS, Math.floor(n));
  return 0;
}

/**
 * Ultra-min home/list JSON (id, title, thumb only where applicable). Set NW_EMERGENCY_MIN_HOME_JSON=1 to enable.
 */
export function emergencyMinPublicJson() {
  return String(process.env.NW_EMERGENCY_MIN_HOME_JSON || '').trim() === '1';
}

/**
 * NW_EMERGENCY_MIN_HOME_JSON=0: full home bundle from DB (summary, thumb, etc.), no read-deadline shortcut,
 * no stale-memory fallback for latest, and skip emergency shield cache read/write on GET /api/home.
 */
export function homeBundleStrictFullFromDb() {
  return String(process.env.NW_EMERGENCY_MIN_HOME_JSON ?? '').trim() === '0';
}

/** Clear in-memory duplicate-response shield (sub-second TTL when enabled). Logs when entries were present. */
export function clearEmergencyApiShieldCache() {
  const n = _cache.size;
  _cache.clear();
  if (n > 0) {
    console.info('[nw/emergency-shield] hard-purged', n, 'entr' + 'y/entries');
  }
  return n;
}

export function emergencyCacheGet(key) {
  const ttl = emergencyShieldTtlMs();
  if (ttl <= 0 || !key) return null;
  const row = _cache.get(key);
  if (!row) return null;
  if (Date.now() - row.at >= ttl) {
    _cache.delete(key);
    return null;
  }
  return row.body;
}

export function emergencyCacheSet(key, body) {
  if (emergencyShieldTtlMs() <= 0 || !key) return;
  _cache.set(key, { at: Date.now(), body });
}
