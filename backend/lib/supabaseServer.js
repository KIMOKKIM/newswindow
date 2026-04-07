import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * 서버 전용: Service Role Key (RLS 우회). 절대 브라우저/프론트에 넣지 말 것.
 * 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export function getServiceSupabase() {
  if (_client) return _client;
  const url = String(process.env.SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(
    String(process.env.SUPABASE_URL || '').trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  );
}

export function assertSupabase() {
  const c = getServiceSupabase();
  if (!c) {
    throw new Error(
      '[Supabase] SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요. 로컬 파일 DB는 NW_LEGACY_FILE_DB=1 일 때만 사용됩니다.'
    );
  }
  return c;
}

/** Supabase Storage: 광고 배너 버킷 이름(.env 로 덮어쓰기 가능) */
export function getBannersBucket() {
  return String(process.env.SUPABASE_BANNERS_BUCKET || 'banners').trim() || 'banners';
}
