import { articlesDb } from '../db/articles.js';
import { mainFeedArticleCap } from '../db/articles.shared.js';

/**
 * publish/approve 직후 공개 피드 일관성 점검 (NW_PUBLIC_FEED_DEBUG=1 일 때만).
 * /api/articles/public/list, /api/home latest, /api/home/headlines 히어로가 동일 소스 순서인지 ids 로 확인.
 */
export async function logPublicFeedAfterPublish(label, articleId, articleTitle) {
  if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() !== '1') return;
  try {
    const cap = mainFeedArticleCap();
    const listRows = await articlesDb.listPublishedForMain();
    const listIds = listRows.map((r) => r.id);
    const hero = await articlesDb.listPublishedLatestHero(10);
    const heroIds = hero.map((r) => r.id);
    const n = Math.min(10, listIds.length, heroIds.length);
    let listHeadVsHeroHeadMatch = true;
    for (let i = 0; i < n; i++) {
      if (listIds[i] !== heroIds[i]) {
        listHeadVsHeroHeadMatch = false;
        break;
      }
    }
    const aid = articleId != null ? Number(articleId) : null;
    const payload = {
      label,
      cap,
      articleId: Number.isFinite(aid) ? aid : null,
      articleTitle: articleTitle != null ? String(articleTitle).slice(0, 200) : null,
      publicListIds: listIds.slice(0, 40),
      homeLatestIds: listIds.slice(0, 40),
      headlinesHeroIds: heroIds.slice(0, 10),
      articleInPublicListTop40: Number.isFinite(aid) && listIds.slice(0, 40).includes(aid),
      articleInHeroTop10: Number.isFinite(aid) && heroIds.slice(0, 10).includes(aid),
      listHeadVsHeroHeadMatch,
    };
    console.log('[nw/feed-consistency]', JSON.stringify(payload));
  } catch (e) {
    console.warn('[nw/feed-consistency] error', e && e.message);
  }
}
