/**
 * Public API shield under DB stress: in-memory TTL cache + optional tiny JSON.
 * NW_EMERGENCY_API_CACHE_MS=0 disables cache. NW_EMERGENCY_MIN_HOME_JSON=0 keeps fuller list fields.
 */

const _cache = new Map();

export function emergencyShieldTtlMs() {
  const n = Number(process.env.NW_EMERGENCY_API_CACHE_MS);
  if (Number.isFinite(n) && n === 0) return 0;
  if (Number.isFinite(n) && n > 0) return Math.min(300_000, Math.floor(n));
  return 10_000;
}

export function emergencyMinPublicJson() {
  return String(process.env.NW_EMERGENCY_MIN_HOME_JSON || '1').trim() !== '0';
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
