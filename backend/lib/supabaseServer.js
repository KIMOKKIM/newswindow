import { createClient } from '@supabase/supabase-js';
import { useLegacyFileDb } from './dbModeCore.js';

let _client = null;
let _warnedLegacyKey = false;

/**
 * Supabase 프로젝트 URL (Vercel/Render 등: SUPABASE_URL)
 */
export function resolveSupabaseUrl() {
  return String(process.env.SUPABASE_URL || '').trim();
}

/**
 * Service Role 키: 반드시 Vercel에는 SUPABASE_SERVICE_ROLE_KEY 로 등록하는 것을 권장.
 * 과거/오타 대비 레거시 이름만 보조로 읽고, canonical 이 없을 때 한 번 경고.
 */
export function resolveServiceRoleKey() {
  const canonical = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (canonical) return canonical;

  const legacy =
    String(process.env.SUPABASE_SERVICE_ROLE || '').trim() ||
    String(process.env.SUPABASE_KEY || '').trim() ||
    String(process.env.SERVICE_ROLE_KEY || '').trim();

  if (legacy && !_warnedLegacyKey) {
    _warnedLegacyKey = true;
    console.warn(
      '[Supabase] 서비스 롤 키를 SUPABASE_SERVICE_ROLE_KEY 가 아닌 다른 env 이름에서 읽었습니다. Vercel에는 SUPABASE_SERVICE_ROLE_KEY 로 통일해 주세요.',
    );
  }
  return legacy;
}

/**
 * 로컬에서 NW_DEV_LEGACY_FILE_DB=1 일 때만 Supabase 생략 허용.
 * 운영(NODE_ENV=production 또는 RENDER=true)에서는 항상 URL·키 필수.
 */
export function assertSupabaseRequiredAtStartup() {
  if (useLegacyFileDb()) return;

  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();

  if (!url) {
    throw new Error('Supabase URL is missing!');
  }
  if (!key) {
    throw new Error('Supabase Key is missing!');
  }
}

/**
 * 서버 전용: Service Role Key (RLS 우회). 절대 브라우저/프론트에 넣지 말 것.
 * 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (권장)
 */
export function getServiceSupabase() {
  if (_client) return _client;
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  if (!url || !key) return null;
  /**
   * Single shared REST client (PostgREST over HTTPS). It does not open raw Postgres :5432
   * sockets from this process, so there is no per-request TCP "close" to call. Pool
   * exhaustion on Supabase is configured in the project (max connections / pooler).
   * For psql, migrations, or ORMs, use the pooler host with port 6543 (transaction mode),
   * not direct session mode on :5432, when many short-lived clients exist.
   */
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  /** One process-global instance only; reuse across all requests (no per-request client). */
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(resolveSupabaseUrl() && resolveServiceRoleKey());
}

export function assertSupabase() {
  const c = getServiceSupabase();
  if (!c) {
    throw new Error('Supabase Key is missing!');
  }
  return c;
}

/** Supabase Storage: 광고 배너 버킷 이름(.env 로 덮어쓰기 가능) */
export function getBannersBucket() {
  return String(process.env.SUPABASE_BANNERS_BUCKET || 'banners').trim() || 'banners';
}
