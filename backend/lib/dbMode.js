import { isSupabaseConfigured } from './supabaseServer.js';
import {
  assertFileArticleAdsWriteAllowed,
  isProductionLike,
  useLegacyFileDb,
} from './dbModeCore.js';

export { assertFileArticleAdsWriteAllowed, isProductionLike, useLegacyFileDb } from './dbModeCore.js';

/** 운영: 항상 true(기동 시 Supabase 필수). 로컬: 레거시 플래그가 없고 Supabase 설정 시 true */
export function useSupabasePersistence() {
  if (isProductionLike()) return true;
  return isSupabaseConfigured() && !useLegacyFileDb();
}

export function getArticlesReadSource() {
  if (isProductionLike()) return 'supabase';
  if (useLegacyFileDb()) return 'legacy-json-file-dev';
  return isSupabaseConfigured() ? 'supabase' : 'unknown';
}

export function getArticlesWriteSource() {
  return getArticlesReadSource();
}

/** 광고 설정은 항상 Supabase ad_site_config (파일 이중 저장 제거) */
export function getAdsReadSource() {
  return 'supabase';
}

export function getAdsWriteSource() {
  return 'supabase';
}
