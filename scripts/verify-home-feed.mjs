/**
 * 메인 피드 상한(NW_MAIN_FEED_MAX_ARTICLES, 기본 400) vs DB published 건수 검증.
 * 사용: 저장소 루트에서 `node scripts/verify-home-feed.mjs`
 * backend/.env 가 있으면 로드합니다.
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function loadBackendEnv() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../backend/.env');
  if (!existsSync(envPath)) return;
  const t = readFileSync(envPath, 'utf8');
  for (const line of t.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i <= 0) continue;
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v;
  }
}

loadBackendEnv();

const { articlesDb } = await import('../backend/db/articles.js');
const { mainFeedArticleCap } = await import('../backend/db/articles.shared.js');

const cap = mainFeedArticleCap();
const publishedTotal = await articlesDb.countPublished();
const list = await articlesDb.listPublishedForMain();
const feedAtCap = publishedTotal > cap && list.length >= cap;
const out = {
  mainFeedCap: cap,
  publishedTotal,
  latestReturned: list.length,
  feedAtCap,
  note: feedAtCap
    ? 'published가 상한보다 많고 응답이 상한에 도달했습니다. 카테고리/구형 기사 누락 가능 — NW_MAIN_FEED_MAX_ARTICLES 상향 검토.'
    : '상한 미도달 또는 상한 내에서 전부 포함 가능.',
};
console.log(JSON.stringify(out, null, 2));
