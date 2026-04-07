/**
 * Admin SPA (Vite)용 Supabase 브라우저 클라이언트.
 *
 * - Next.js 와 달리 Vite 는 import.meta.env 만 지원하므로 변수 이름은 VITE_ 접두사 권장.
 * - 동일 값을 NEXT_PUBLIC_* 로도 읽어 두어, 문서/호환용이다.
 *
 * 보안: anon 키만 사용. 기사/광고 쓰기는 RLS 없이 직접 쓰면 안 되며,
 * 현재 운영 흐름은 apiFetch → 백엔드(Service Role)이다.
 */
import { createClient } from '@supabase/supabase-js';

function pickUrl() {
  const v =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  return String(v || '').trim();
}

function pickAnon() {
  const v =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return String(v || '').trim();
}

let _client = null;

/** URL·anon 키가 모두 있을 때만 클라이언트 생성 */
export function getSupabaseBrowserClient() {
  if (_client) return _client;
  const url = pickUrl();
  const anon = pickAnon();
  if (!url || !anon) return null;
  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function isSupabaseBrowserConfigured() {
  return Boolean(pickUrl() && pickAnon());
}
