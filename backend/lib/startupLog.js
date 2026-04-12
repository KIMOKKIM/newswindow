import { resolveServiceRoleKey, resolveSupabaseUrl } from './supabaseServer.js';

export function logSupabaseEnvStatus() {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  const urlOk = Boolean(url);
  const keyOk = Boolean(key);
  console.log('[nw/boot] supabase env: URL', urlOk ? 'present' : 'MISSING');
  console.log('[nw/boot] supabase env: SERVICE_ROLE_KEY', keyOk ? 'present' : 'MISSING');
  return { urlOk, keyOk };
}

export function fatalStartupOneLine(message) {
  console.error('[NW FATAL STARTUP]', String(message || '').slice(0, 300));
}
