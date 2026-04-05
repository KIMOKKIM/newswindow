import fs from 'fs';
import {
  BACKEND_ROOT,
  DEFAULT_DATA_DIR,
  getAdsJsonPath,
  getArticlesJsonPath,
  getUploadsRoot,
  getUsersJsonPath,
} from '../config/dataPaths.js';

function isUnderBackendBundle(absPath) {
  const norm = absPath.replace(/\\/g, '/');
  const root = BACKEND_ROOT.replace(/\\/g, '/');
  return norm.startsWith(root + '/') || norm === root;
}

/**
 * 배포 환경에서 에페메럴 파일시스템에 쓰고 있으면 경고(데이터가 재배포마다 사라질 수 있음).
 */
export function logPersistenceOnStartup() {
  const articlesPath = getArticlesJsonPath();
  const adsPath = getAdsJsonPath();
  const usersPath = getUsersJsonPath();
  const uploadsRoot = getUploadsRoot();

  const lines = [
    '[persistence] articles JSON → ' + articlesPath + (process.env.NW_ARTICLES_JSON_PATH ? ' (NW_ARTICLES_JSON_PATH)' : ' (default)'),
    '[persistence] ads JSON      → ' + adsPath + (process.env.NW_ADS_JSON_PATH ? ' (NW_ADS_JSON_PATH)' : ' (default)'),
    '[persistence] users JSON    → ' + usersPath + (process.env.NW_USERS_JSON_PATH ? ' (NW_USERS_JSON_PATH)' : ' (default)'),
    '[persistence] uploads root  → ' + uploadsRoot + (process.env.NW_UPLOADS_ROOT ? ' (NW_UPLOADS_ROOT)' : ' (default)'),
  ];
  for (const L of lines) console.log(L);

  const warnEphemeral =
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    String(process.env.NW_PERSISTENCE_WARN || '').trim() === '1';

  if (!warnEphemeral) return;

  const issues = [];
  if (!process.env.NW_ARTICLES_JSON_PATH && isUnderBackendBundle(articlesPath)) {
    issues.push('NW_ARTICLES_JSON_PATH 미설정: 기사가 배포 번들 내 backend/data 에 저장되어 재배포 시 초기화됩니다.');
  }
  if (!process.env.NW_ADS_JSON_PATH && isUnderBackendBundle(adsPath)) {
    issues.push('NW_ADS_JSON_PATH 미설정: 광고 JSON이 재배포 시 초기화될 수 있습니다.');
  }
  if (!process.env.NW_USERS_JSON_PATH && isUnderBackendBundle(usersPath)) {
    issues.push('NW_USERS_JSON_PATH 미설정: 사용자 데이터가 재배포 시 초기화될 수 있습니다.');
  }
  if (!process.env.NW_UPLOADS_ROOT && isUnderBackendBundle(uploadsRoot)) {
    issues.push('NW_UPLOADS_ROOT 미설정: 업로드 이미지가 backend/uploads 에 있어 재배포 시 유실됩니다.');
  }

  if (issues.length === 0) {
    console.log('[persistence] 영구 경로(NW_*_JSON_PATH / NW_UPLOADS_ROOT)가 설정된 것으로 보입니다.');
    return;
  }

  console.warn('[persistence] ━━━ 데이터 유실 위험 ━━━');
  for (const m of issues) console.warn('[persistence] · ' + m);
  console.warn('[persistence] Render 등: Persistent Disk 마운트 후 위 환경변수로 디스크 절대경로를 지정하세요.');
  console.warn('[persistence] 예: NW_ARTICLES_JSON_PATH=/data/articles.json NW_ADS_JSON_PATH=/data/ads.json NW_USERS_JSON_PATH=/data/users.json NW_UPLOADS_ROOT=/data/uploads');
}

/** 헬스/운영 점검용 */
export function getPersistenceSnapshot() {
  const articlesPath = getArticlesJsonPath();
  const adsPath = getAdsJsonPath();
  return {
    articlesPath,
    adsPath,
    usersPath: getUsersJsonPath(),
    uploadsRoot: getUploadsRoot(),
    articlesBytes: safeStat(articlesPath),
    adsBytes: safeStat(adsPath),
    envOverrides: {
      NW_ARTICLES_JSON_PATH: Boolean(process.env.NW_ARTICLES_JSON_PATH),
      NW_ADS_JSON_PATH: Boolean(process.env.NW_ADS_JSON_PATH),
      NW_USERS_JSON_PATH: Boolean(process.env.NW_USERS_JSON_PATH),
      NW_UPLOADS_ROOT: Boolean(process.env.NW_UPLOADS_ROOT),
    },
  };
}

function safeStat(p) {
  try {
    return fs.existsSync(p) ? fs.statSync(p).size : null;
  } catch {
    return null;
  }
}
