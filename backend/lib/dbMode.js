import { isSupabaseConfigured } from './supabaseServer.js';

/** NW_LEGACY_FILE_DB=1 이면 파일 기반(JSON) 유지. 그 외에는 Supabase 필수. */
export function useLegacyFileDb() {
  return String(process.env.NW_LEGACY_FILE_DB || '').trim() === '1';
}

export function useSupabasePersistence() {
  return isSupabaseConfigured() && !useLegacyFileDb();
}
