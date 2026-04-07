import fs from 'fs';
import { writeJsonFileAtomic } from '../lib/atomicJsonWrite.js';
import { ensureDirForFile, getArticlesJsonPath } from '../config/dataPaths.js';
import {
  nowStr,
  canonicalStoreStatus,
  toApiStatus,
  isPublicFeedReadableStatus,
  authorIdNorm,
  reporterOwnsArticleRecord,
  mapListFields,
  mapDetail,
  sortTimePublished,
  sortTimeMainFeed,
  publicListThumb,
  mapPublishedListItem,
  normalizeTitleDedupeKey,
  dedupeWindowMs,
} from './articles.shared.js';

const articlesPath = getArticlesJsonPath();
ensureDirForFile(articlesPath);

let articles = [];
if (fs.existsSync(articlesPath)) {
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } catch {}
}
if (!Array.isArray(articles)) articles = [];

function save() {
  writeJsonFileAtomic(articlesPath, articles);
  if (process.env.NW_DEBUG === '1') {
    console.log('[articlesDb] write path=', articlesPath, 'rowCount=', articles.length);
  }
}

function resolveArticleRecord(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (Number.isFinite(n)) {
    return articles.find((x) => x.id === n) || null;
  }
  const s = String(id);
  return articles.find((x) => (x.slug || '') === s) || null;
}

/** 동기 레거시 구현 — articles.js 에서 async 로 감쌈 */
export const legacySyncArticlesDb = {
  count() {
    return articles.length;
  },

  all() {
    return [...articles].reverse().map((a) => mapListFields(a));
  },

  listPublishedForMain() {
    return [...articles]
      .filter((a) => isPublicFeedReadableStatus(a.status))
      .sort((x, y) => sortTimeMainFeed(y) - sortTimeMainFeed(x))
      .map((a) => ({
        id: a.id,
        title: a.title || '',
        subtitle: a.subtitle || '',
        category: a.category || '',
        author_name: a.author_name || '',
        created_at: a.created_at || '',
        published_at: a.published_at || '',
        submitted_at: a.submitted_at || '',
        updated_at: a.updated_at || '',
        status: toApiStatus(a.status),
        views: Number(a.views) || 0,
        thumb: publicListThumb(a),
      }));
  },

  listPublishedPaginated(page, pageSize) {
    const size = Math.min(20, Math.max(1, Number(pageSize) || 20));
    const p = Math.max(1, Number(page) || 1);
    const all = [...articles]
      .filter((a) => toApiStatus(a.status) === 'published')
      .sort((x, y) => sortTimePublished(y) - sortTimePublished(x));
    const total = all.length;
    const start = (p - 1) * size;
    const slice = all.slice(start, start + size);
    const items = slice.map((a) => mapPublishedListItem(a));
    return {
      items,
      total,
      page: p,
      pageSize: size,
      totalPages: Math.max(1, Math.ceil(total / size)),
    };
  },

  listPublishedPopularByMonths(months, limit) {
    const m = Math.max(1, Math.min(24, Number(months) || 3));
    const sinceMs = Date.now() - m * 30 * 24 * 60 * 60 * 1000;
    const lim = Math.min(50, Math.max(1, Number(limit) || 10));
    return [...articles]
      .filter((a) => toApiStatus(a.status) === 'published')
      .filter((a) => sortTimePublished(a) >= sinceMs)
      .sort((x, y) => (Number(y.views) || 0) - (Number(x.views) || 0))
      .slice(0, lim)
      .map((a) => mapPublishedListItem(a));
  },

  findByAuthor(authorId, reporterDisplayName) {
    const want = authorIdNorm(authorId);
    if (want == null) return [];
    const nameWant = reporterDisplayName == null ? '' : String(reporterDisplayName).trim();
    return articles
      .filter((a) => reporterOwnsArticleRecord(a, want, nameWant))
      .reverse()
      .map((a) => ({
        id: a.id,
        title: a.title || '',
        subtitle: a.subtitle || '',
        author_name: a.author_name || '',
        category: a.category || '',
        content: a.content || '',
        content1: a.content1,
        content2: a.content2,
        content3: a.content3,
        content4: a.content4,
        image1: a.image1,
        image2: a.image2,
        image3: a.image3,
        image4: a.image4,
        summary: a.summary || '',
        status: toApiStatus(a.status),
        created_at: a.created_at || '',
        updated_at: a.updated_at || a.created_at || '',
        submitted_at: a.submitted_at || '',
        published_at: a.published_at || '',
        rejected_at: a.rejected_at || '',
        views: Number(a.views) || 0,
      }));
  },

  insert(data) {
    const id = articles.length ? Math.max(...articles.map((a) => a.id)) + 1 : 1;
    const allContent = [data.content1, data.content2, data.content3, data.content4].filter(Boolean).join('\n');
    const now = nowStr();
    const st = canonicalStoreStatus(data.status != null ? data.status : 'draft');
    const rec = {
      id,
      title: data.title || '',
      subtitle: data.subtitle || '',
      author_id: authorIdNorm(data.authorId),
      author_name: data.authorName || '',
      category: data.category || '',
      content: data.content || allContent,
      content1: data.content1 || '',
      content2: data.content2 || '',
      content3: data.content3 || '',
      content4: data.content4 || '',
      image1: data.image1 || '',
      image2: data.image2 || '',
      image3: data.image3 || '',
      image4: data.image4 || '',
      image1_caption: data.image1_caption || '',
      image2_caption: data.image2_caption || '',
      image3_caption: data.image3_caption || '',
      image4_caption: data.image4_caption || '',
      summary: data.summary || allContent.slice(0, 200) || '',
      status: st,
      created_at: now,
      updated_at: now,
      submitted_at: st === 'submitted' ? now : '',
      published_at: st === 'published' ? now : '',
      rejected_at: st === 'rejected' ? now : '',
      views: 0,
    };
    articles.push(rec);
    save();
    if (process.env.NW_DEBUG === '1') {
      console.log('[articlesDb] insert id=', rec.id, 'author_id=', rec.author_id, 'status=', rec.status, 'path=', articlesPath);
    }
    return mapDetail(rec);
  },

  authorIdForArticle(id) {
    const a = resolveArticleRecord(id);
    return a ? a.author_id : null;
  },

  incrementPublicViews(id) {
    const a = resolveArticleRecord(id);
    if (!a || toApiStatus(a.status) !== 'published') return null;
    a.views = Number(a.views || 0) + 1;
    a.updated_at = nowStr();
    save();
    return mapDetail(a);
  },

  findById(id, authorId, reporterDisplayName) {
    const a = resolveArticleRecord(id);
    if (!a) return null;
    if (authorId == null) return mapDetail(a);
    if (!reporterOwnsArticleRecord(a, authorId, reporterDisplayName)) return null;
    return mapDetail(a);
  },

  rawRecord(id) {
    return resolveArticleRecord(id);
  },

  update(id, authorId, data, reporterDisplayName) {
    const a = resolveArticleRecord(id);
    if (!a || !reporterOwnsArticleRecord(a, authorId, reporterDisplayName)) return false;
    const now = nowStr();
    if (data.title !== undefined) a.title = data.title;
    if (data.subtitle !== undefined) a.subtitle = data.subtitle;
    if (data.category !== undefined) a.category = data.category;
    if (data.content !== undefined) a.content = data.content;
    if (data.content1 !== undefined) a.content1 = data.content1;
    if (data.content2 !== undefined) a.content2 = data.content2;
    if (data.content3 !== undefined) a.content3 = data.content3;
    if (data.content4 !== undefined) a.content4 = data.content4;
    if (data.image1 !== undefined) a.image1 = data.image1;
    if (data.image2 !== undefined) a.image2 = data.image2;
    if (data.image3 !== undefined) a.image3 = data.image3;
    if (data.image4 !== undefined) a.image4 = data.image4;
    if (data.image1_caption !== undefined) a.image1_caption = data.image1_caption;
    if (data.image2_caption !== undefined) a.image2_caption = data.image2_caption;
    if (data.image3_caption !== undefined) a.image3_caption = data.image3_caption;
    if (data.image4_caption !== undefined) a.image4_caption = data.image4_caption;
    if (data.summary !== undefined) a.summary = data.summary;
    if (data.status !== undefined) {
      const next = canonicalStoreStatus(data.status);
      const prev = canonicalStoreStatus(a.status);
      a.status = next;
      if (next === 'submitted' && prev !== 'submitted') a.submitted_at = a.submitted_at || now;
      if (next === 'published') a.published_at = a.published_at || now;
      if (next === 'rejected') a.rejected_at = a.rejected_at || now;
    }
    a.updated_at = now;
    save();
    return true;
  },

  updateByStaff(id, data) {
    const a = resolveArticleRecord(id);
    if (!a) return false;
    const now = nowStr();
    if (data.title !== undefined) a.title = data.title;
    if (data.subtitle !== undefined) a.subtitle = data.subtitle;
    if (data.category !== undefined) a.category = data.category;
    if (data.content !== undefined) a.content = data.content;
    if (data.content1 !== undefined) a.content1 = data.content1;
    if (data.content2 !== undefined) a.content2 = data.content2;
    if (data.content3 !== undefined) a.content3 = data.content3;
    if (data.content4 !== undefined) a.content4 = data.content4;
    if (data.image1 !== undefined) a.image1 = data.image1;
    if (data.image2 !== undefined) a.image2 = data.image2;
    if (data.image3 !== undefined) a.image3 = data.image3;
    if (data.image4 !== undefined) a.image4 = data.image4;
    if (data.image1_caption !== undefined) a.image1_caption = data.image1_caption;
    if (data.image2_caption !== undefined) a.image2_caption = data.image2_caption;
    if (data.image3_caption !== undefined) a.image3_caption = data.image3_caption;
    if (data.image4_caption !== undefined) a.image4_caption = data.image4_caption;
    if (data.summary !== undefined) a.summary = data.summary;
    if (data.status !== undefined) {
      const next = canonicalStoreStatus(data.status);
      const prev = canonicalStoreStatus(a.status);
      a.status = next;
      if (next === 'submitted' && prev !== 'submitted') a.submitted_at = a.submitted_at || now;
      if (next === 'published') a.published_at = a.published_at || now;
      if (next === 'rejected') a.rejected_at = a.rejected_at || now;
    }
    a.updated_at = now;
    save();
    return true;
  },

  updateStatus(id, status) {
    const a = resolveArticleRecord(id);
    if (!a) return false;
    const now = nowStr();
    const next = canonicalStoreStatus(status);
    const prev = canonicalStoreStatus(a.status);
    a.status = next;
    if (next === 'submitted' && prev !== 'submitted') a.submitted_at = a.submitted_at || now;
    if (next === 'published') a.published_at = a.published_at || now;
    if (next === 'rejected') a.rejected_at = a.rejected_at || now;
    a.updated_at = now;
    save();
    return true;
  },

  /** 동일 기자·정규화 제목·짧은 시간 내 송고/게시 중복 */
  findRecentDuplicateForAuthorSubmission(authorId, titleNorm, excludeId, windowMs) {
    const want = authorIdNorm(authorId);
    if (want == null || !titleNorm) return null;
    const ex = excludeId != null && excludeId !== '' ? Number(excludeId) : null;
    const w = windowMs != null ? Number(windowMs) : dedupeWindowMs();
    const now = Date.now();
    for (let i = articles.length - 1; i >= 0; i--) {
      const a = articles[i];
      if (ex != null && Number(a.id) === ex) continue;
      if (authorIdNorm(a.author_id) !== want) continue;
      if (normalizeTitleDedupeKey(a.title) !== titleNorm) continue;
      const st = toApiStatus(a.status);
      if (st !== 'submitted' && st !== 'published') continue;
      const t = Date.parse(String(a.created_at || '').replace(' ', 'T'));
      if (!Number.isFinite(t)) continue;
      if (now - t <= w) return { id: a.id };
    }
    return null;
  },

  approveFromSubmitted(id) {
    const a = resolveArticleRecord(id);
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'published') return { ok: true, idempotent: true, article: mapDetail(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 승인할 수 있습니다.' };
    const now = nowStr();
    a.status = 'published';
    a.published_at = a.published_at || now;
    a.updated_at = now;
    save();
    return { ok: true, article: mapDetail(a) };
  },

  rejectFromSubmitted(id) {
    const a = resolveArticleRecord(id);
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'rejected') return { ok: true, idempotent: true, article: mapDetail(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 반려할 수 있습니다.' };
    const now = nowStr();
    a.status = 'rejected';
    a.rejected_at = a.rejected_at || now;
    a.updated_at = now;
    save();
    return { ok: true, article: mapDetail(a) };
  },
};
