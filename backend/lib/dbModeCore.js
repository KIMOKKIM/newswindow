import path from 'path';
import { getAdsJsonPath, getArticlesJsonPath } from '../config/dataPaths.js';

/** 운영·Render 등: 레거시 파일 DB 및 에페메럴 JSON 쓰기를 강제로 끈다 */
export function isProductionLike() {
  return (
    process.env.NODE_ENV === 'production' || String(process.env.RENDER || '').trim() === 'true'
  );
}

/**
 * 비운영에서만 `NW_DEV_LEGACY_FILE_DB=1` 일 때 기사·사용자 등 파일(JSON) 경로 허용.
 * 운영에서는 항상 false.
 */
export function useLegacyFileDb() {
  if (isProductionLike()) return false;
  return String(process.env.NW_DEV_LEGACY_FILE_DB || '').trim() === '1';
}

/**
 * 운영에서 articles.json / ads.json 대상 atomic 쓰기 차단 (API는 Supabase 단일화)
 */
export function assertFileArticleAdsWriteAllowed(filePath) {
  if (!isProductionLike()) return;
  const norm = path.resolve(String(filePath || ''));
  const articles = path.resolve(getArticlesJsonPath());
  const ads = path.resolve(getAdsJsonPath());
  if (norm === articles || norm === ads) {
    throw new Error(
      '[NW] 운영 환경에서 articles.json/ads.json 파일 쓰기는 차단되었습니다. Supabase를 사용하세요.',
    );
  }
}
