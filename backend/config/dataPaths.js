import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** backend/ (db, routes 등이아닌 서버 루트의 상위가 아니라 config의 부모 = backend) */
export const BACKEND_ROOT = path.join(__dirname, '..');

export const DEFAULT_DATA_DIR = path.join(BACKEND_ROOT, 'data');

export function getArticlesJsonPath() {
  return process.env.NW_ARTICLES_JSON_PATH
    ? path.resolve(process.env.NW_ARTICLES_JSON_PATH)
    : path.join(DEFAULT_DATA_DIR, 'articles.json');
}

export function getAdsJsonPath() {
  return process.env.NW_ADS_JSON_PATH
    ? path.resolve(process.env.NW_ADS_JSON_PATH)
    : path.join(DEFAULT_DATA_DIR, 'ads.json');
}

export function getUsersJsonPath() {
  return process.env.NW_USERS_JSON_PATH
    ? path.resolve(process.env.NW_USERS_JSON_PATH)
    : path.join(DEFAULT_DATA_DIR, 'users.json');
}

/**
 * 광고 이미지 등 업로드 파일 — 미지정 시 backend/uploads (재배포 시 유실).
 * Render Persistent Disk 사용 시 NW_UPLOADS_ROOT=/data/uploads 등으로 디스크와 동일 루트 권장.
 */
export function getUploadsRoot() {
  return process.env.NW_UPLOADS_ROOT
    ? path.resolve(process.env.NW_UPLOADS_ROOT)
    : path.join(BACKEND_ROOT, 'uploads');
}

export function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
