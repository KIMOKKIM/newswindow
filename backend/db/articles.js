import { useSupabasePersistence } from '../lib/dbMode.js';
import { legacySyncArticlesDb } from './articles.legacy.file.js';
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

const L = legacySyncArticlesDb;

/** 레거시는 동기 구현을 async 로 감싼다 */
const legacyAsync = {
  count: async () => L.count(),
  all: async () => L.all(),
  listPublishedForMain: async () => L.listPublishedForMain(),
  listPublishedPaginated: async (...a) => L.listPublishedPaginated(...a),
  listPublishedPopularByMonths: async (...a) => L.listPublishedPopularByMonths(...a),
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

export const articlesDb = useSupabasePersistence() ? supabaseArticlesDb : legacyAsync;
