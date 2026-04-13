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

/** Always full public payloads (summary, category, etc.). Env NW_EMERGENCY_MIN_HOME_JSON is ignored. */
export function emergencyMinPublicJson() {
  return false;
}

export function clearEmergencyApiShieldCache() {
  _cache.clear();
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
