import { isProductionLike, useLegacyFileDb } from '../lib/dbModeCore.js';
import { articlesDb as supabaseArticlesDb } from './articles.supabase.js';

export {
  canonicalStoreStatus,
  toApiStatus,
  isPublicFeedReadableStatus,
  isReporterArticleOwnershipFallbackStatus,
  authorIdNorm,
  normalizeTitleDedupeKey,
  dedupeWindowMs,
} from './articles.shared.js';

/** 레거시는 동기 구현을 async 로 감싼다 — 로컬 + NW_DEV_LEGACY_FILE_DB=1 일 때만 로드 */
function wrapLegacy(L) {
  return {
    count: async () => L.count(),
    countPublished: async () => L.countPublished(),
    all: async () => L.all(),
    listPublishedForMain: async () => L.listPublishedForMain(),
    listPublishedPaginated: async (...a) => L.listPublishedPaginated(...a),
    listPublishedPopularByMonths: async (...a) => L.listPublishedPopularByMonths(...a),
    listPublishedPopularSince: async (...a) => L.listPublishedPopularSince(...a),
    findByAuthor: async (...a) => L.findByAuthor(...a),
    insert: async (data) => L.insert(data),
    authorIdForArticle: async (...a) => L.authorIdForArticle(...a),
    incrementPublicViews: async (...a) => L.incrementPublicViews(...a),
    findById: async (...a) => L.findById(...a),
    rawRecord: async (...a) => L.rawRecord(...a),
    update: async (...a) => L.update(...a),
    updateByStaff: async (...a) => L.updateByStaff(...a),
    updateStatus: async (...a) => L.updateStatus(...a),
    findRecentDuplicateForAuthorSubmission: async (...a) =>
      Promise.resolve(L.findRecentDuplicateForAuthorSubmission(...a)),
    approveFromSubmitted: async (...a) => Promise.resolve(L.approveFromSubmitted(...a)),
    rejectFromSubmitted: async (...a) => Promise.resolve(L.rejectFromSubmitted(...a)),
  };
}

let articlesDb = supabaseArticlesDb;
if (!isProductionLike() && useLegacyFileDb()) {
  const mod = await import('./articles.legacy.file.js');
  articlesDb = wrapLegacy(mod.legacySyncArticlesDb);
}

export { articlesDb };
