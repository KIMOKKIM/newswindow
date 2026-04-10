import { assertSupabase } from '../lib/supabaseServer.js';
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
  rowToArticleRecord,
  normalizeTitleDedupeKey,
  dedupeWindowMs,
  popularWindowReferenceMs,
  comparePopularArticlesDesc,
  mainFeedArticleCap,
} from './articles.shared.js';

function sb() {
  return assertSupabase();
}

/** 목록·메인 피드용 — 본문/다중 이미지 제외 (SELECT * 금지) */
const PUBLISHED_LIST_SELECT =
  'id,title,subtitle,category,author_name,created_at,published_at,submitted_at,updated_at,status,views,image1';

async function selectAll() {
  const { data, error } = await sb().from('articles').select('*');
  if (error) throw error;
  return (data || []).map(rowToArticleRecord);
}

async function resolveArticleRecord(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (Number.isFinite(n)) {
    const { data, error } = await sb().from('articles').select('*').eq('id', n).maybeSingle();
    if (error) throw error;
    return rowToArticleRecord(data);
  }
  return null;
}

export const articlesDb = {
  async count() {
    const { count, error } = await sb().from('articles').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  /** 메인 피드 상한(400) 검증용 — status=published 건수 */
  async countPublished() {
    const { count, error } = await sb()
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    if (error) throw error;
    return count || 0;
  },

  async all() {
    const rows = await selectAll();
    return [...rows].sort((a, b) => b.id - a.id).map((a) => mapListFields(a));
  },

  async listPublishedForMain() {
    const cap = mainFeedArticleCap();
    const { data, error } = await sb()
      .from('articles')
      .select(PUBLISHED_LIST_SELECT)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(cap);
    if (error) throw error;
    const rows = (data || []).map(rowToArticleRecord);
    return rows
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

  async listPublishedPaginated(page, pageSize) {
    const size = Math.min(20, Math.max(1, Number(pageSize) || 20));
    const p = Math.max(1, Number(page) || 1);
    const rows = await selectAll();
    const all = rows
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

  async listPublishedPopularSince(sinceMs, limit) {
    const since = Number(sinceMs);
    const lim = Math.min(50, Math.max(1, Number(limit) || 10));
    if (!Number.isFinite(since)) return [];
    const sinceIso = new Date(since).toISOString();
    const { data, error } = await sb()
      .from('articles')
      .select(PUBLISHED_LIST_SELECT)
      .eq('status', 'published')
      .or(`published_at.gte.${sinceIso},created_at.gte.${sinceIso}`);
    if (error) {
      const fallback = await sb()
        .from('articles')
        .select(PUBLISHED_LIST_SELECT)
        .eq('status', 'published')
        .gte('published_at', sinceIso);
      if (fallback.error) throw fallback.error;
      const rowsFb = (fallback.data || []).map(rowToArticleRecord);
      return rowsFb
        .filter((a) => {
          const ref = popularWindowReferenceMs(a);
          return ref != null && ref >= since;
        })
        .sort(comparePopularArticlesDesc)
        .slice(0, lim)
        .map((a) => mapPublishedListItem(a));
    }
    const rows = (data || []).map(rowToArticleRecord);
    return rows
      .filter((a) => {
        const ref = popularWindowReferenceMs(a);
        return ref != null && ref >= since;
      })
      .sort(comparePopularArticlesDesc)
      .slice(0, lim)
      .map((a) => mapPublishedListItem(a));
  },

  async listPublishedPopularByMonths(months, limit) {
    const m = Math.max(1, Math.min(24, Number(months) || 3));
    const sinceMs = Date.now() - m * 30 * 24 * 60 * 60 * 1000;
    return this.listPublishedPopularSince(sinceMs, limit);
  },

  async findByAuthor(authorId, reporterDisplayName) {
    const want = authorIdNorm(authorId);
    if (want == null) return [];
    const nameWant = reporterDisplayName == null ? '' : String(reporterDisplayName).trim();
    const rows = await selectAll();
    return rows
      .filter((a) => reporterOwnsArticleRecord(a, want, nameWant))
      .sort((a, b) => b.id - a.id)
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

  async insert(data) {
    const allContent = [data.content1, data.content2, data.content3, data.content4].filter(Boolean).join('\n');
    const now = nowStr();
    const st = canonicalStoreStatus(data.status != null ? data.status : 'draft');
    const row = {
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
      submitted_at: st === 'submitted' ? now : null,
      published_at: st === 'published' ? now : null,
      rejected_at: st === 'rejected' ? now : null,
      views: 0,
    };
    const { data: inserted, error } = await sb().from('articles').insert(row).select().single();
    if (error) throw error;
    const rec = rowToArticleRecord(inserted);
    if (process.env.NW_DEBUG === '1') console.log('[articlesDb] supabase insert id=', rec.id);
    return mapDetail(rec);
  },

  async authorIdForArticle(id) {
    const a = await resolveArticleRecord(id);
    return a ? a.author_id : null;
  },

  async incrementPublicViews(id) {
    const a = await resolveArticleRecord(id);
    if (!a || toApiStatus(a.status) !== 'published') return null;
    const views = Number(a.views || 0) + 1;
    const upd = { views, updated_at: nowStr() };
    const { data, error } = await sb().from('articles').update(upd).eq('id', a.id).select().single();
    if (error) throw error;
    return mapDetail(rowToArticleRecord(data));
  },

  async findById(id, authorId, reporterDisplayName) {
    const a = await resolveArticleRecord(id);
    if (!a) return null;
    if (authorId == null) return mapDetail(a);
    if (!reporterOwnsArticleRecord(a, authorId, reporterDisplayName)) return null;
    return mapDetail(a);
  },

  async rawRecord(id) {
    return resolveArticleRecord(id);
  },

  async update(id, authorId, data, reporterDisplayName) {
    const a = await resolveArticleRecord(id);
    if (!a || !reporterOwnsArticleRecord(a, authorId, reporterDisplayName)) return false;
    const now = nowStr();
    const patch = { updated_at: now };
    if (data.title !== undefined) patch.title = data.title;
    if (data.subtitle !== undefined) patch.subtitle = data.subtitle;
    if (data.category !== undefined) patch.category = data.category;
    if (data.content !== undefined) patch.content = data.content;
    if (data.content1 !== undefined) patch.content1 = data.content1;
    if (data.content2 !== undefined) patch.content2 = data.content2;
    if (data.content3 !== undefined) patch.content3 = data.content3;
    if (data.content4 !== undefined) patch.content4 = data.content4;
    if (data.image1 !== undefined) patch.image1 = data.image1;
    if (data.image2 !== undefined) patch.image2 = data.image2;
    if (data.image3 !== undefined) patch.image3 = data.image3;
    if (data.image4 !== undefined) patch.image4 = data.image4;
    if (data.image1_caption !== undefined) patch.image1_caption = data.image1_caption;
    if (data.image2_caption !== undefined) patch.image2_caption = data.image2_caption;
    if (data.image3_caption !== undefined) patch.image3_caption = data.image3_caption;
    if (data.image4_caption !== undefined) patch.image4_caption = data.image4_caption;
    if (data.summary !== undefined) patch.summary = data.summary;
    if (data.status !== undefined) {
      const next = canonicalStoreStatus(data.status);
      const prev = canonicalStoreStatus(a.status);
      patch.status = next;
      if (next === 'submitted' && prev !== 'submitted') patch.submitted_at = a.submitted_at || now;
      if (next === 'published') patch.published_at = a.published_at || now;
      if (next === 'rejected') patch.rejected_at = a.rejected_at || now;
    }
    const { error } = await sb().from('articles').update(patch).eq('id', a.id);
    if (error) throw error;
    return true;
  },

  async updateByStaff(id, data) {
    const a = await resolveArticleRecord(id);
    if (!a) return false;
    const now = nowStr();
    const patch = { updated_at: now };
    if (data.title !== undefined) patch.title = data.title;
    if (data.subtitle !== undefined) patch.subtitle = data.subtitle;
    if (data.category !== undefined) patch.category = data.category;
    if (data.content !== undefined) patch.content = data.content;
    if (data.content1 !== undefined) patch.content1 = data.content1;
    if (data.content2 !== undefined) patch.content2 = data.content2;
    if (data.content3 !== undefined) patch.content3 = data.content3;
    if (data.content4 !== undefined) patch.content4 = data.content4;
    if (data.image1 !== undefined) patch.image1 = data.image1;
    if (data.image2 !== undefined) patch.image2 = data.image2;
    if (data.image3 !== undefined) patch.image3 = data.image3;
    if (data.image4 !== undefined) patch.image4 = data.image4;
    if (data.image1_caption !== undefined) patch.image1_caption = data.image1_caption;
    if (data.image2_caption !== undefined) patch.image2_caption = data.image2_caption;
    if (data.image3_caption !== undefined) patch.image3_caption = data.image3_caption;
    if (data.image4_caption !== undefined) patch.image4_caption = data.image4_caption;
    if (data.summary !== undefined) patch.summary = data.summary;
    if (data.status !== undefined) {
      const next = canonicalStoreStatus(data.status);
      const prev = canonicalStoreStatus(a.status);
      patch.status = next;
      if (next === 'submitted' && prev !== 'submitted') patch.submitted_at = a.submitted_at || now;
      if (next === 'published') patch.published_at = a.published_at || now;
      if (next === 'rejected') patch.rejected_at = a.rejected_at || now;
    }
    const { error } = await sb().from('articles').update(patch).eq('id', a.id);
    if (error) throw error;
    return true;
  },

  async updateStatus(id, status) {
    const a = await resolveArticleRecord(id);
    if (!a) return false;
    const now = nowStr();
    const next = canonicalStoreStatus(status);
    const prev = canonicalStoreStatus(a.status);
    const patch = {
      status: next,
      updated_at: now,
    };
    if (next === 'submitted' && prev !== 'submitted') patch.submitted_at = a.submitted_at || now;
    if (next === 'published') patch.published_at = a.published_at || now;
    if (next === 'rejected') patch.rejected_at = a.rejected_at || now;
    const { error } = await sb().from('articles').update(patch).eq('id', a.id);
    if (error) throw error;
    return true;
  },

  async findRecentDuplicateForAuthorSubmission(authorId, titleNorm, excludeId, windowMs) {
    const want = authorIdNorm(authorId);
    if (want == null || !titleNorm) return null;
    const w = windowMs != null ? Number(windowMs) : dedupeWindowMs();
    const sinceIso = new Date(Math.max(0, Date.now() - w)).toISOString();
    const { data, error } = await sb()
      .from('articles')
      .select('id,title,created_at,status')
      .eq('author_id', want)
      .gte('created_at', sinceIso);
    if (error) throw error;
    const ex = excludeId != null && excludeId !== '' ? Number(excludeId) : null;
    for (const r of data || []) {
      const row = rowToArticleRecord(r);
      if (ex != null && Number(row.id) === ex) continue;
      if (normalizeTitleDedupeKey(row.title) !== titleNorm) continue;
      const st = toApiStatus(row.status);
      if (st !== 'submitted' && st !== 'published') continue;
      return { id: row.id };
    }
    return null;
  },

  async approveFromSubmitted(id) {
    const a = await resolveArticleRecord(id);
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'published') return { ok: true, idempotent: true, article: mapDetail(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 승인할 수 있습니다.' };
    const now = nowStr();
    const n = Number(id);
    const { data, error } = await sb()
      .from('articles')
      .update({
        status: 'published',
        published_at: a.published_at || now,
        updated_at: now,
      })
      .eq('id', n)
      .in('status', ['submitted', 'pending', 'sent'])
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return { ok: true, article: mapDetail(rowToArticleRecord(data)) };
    const again = await resolveArticleRecord(id);
    if (again && toApiStatus(again.status) === 'published')
      return { ok: true, idempotent: true, article: mapDetail(again) };
    return { ok: false, http: 409, error: '이미 처리되었거나 승인할 수 없는 상태입니다.' };
  },

  async rejectFromSubmitted(id) {
    const a = await resolveArticleRecord(id);
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'rejected') return { ok: true, idempotent: true, article: mapDetail(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 반려할 수 있습니다.' };
    const now = nowStr();
    const n = Number(id);
    const { data, error } = await sb()
      .from('articles')
      .update({
        status: 'rejected',
        rejected_at: a.rejected_at || now,
        updated_at: now,
      })
      .eq('id', n)
      .in('status', ['submitted', 'pending', 'sent'])
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return { ok: true, article: mapDetail(rowToArticleRecord(data)) };
    const again = await resolveArticleRecord(id);
    if (again && toApiStatus(again.status) === 'rejected')
      return { ok: true, idempotent: true, article: mapDetail(again) };
    return { ok: false, http: 409, error: '이미 처리되었거나 반려할 수 없는 상태입니다.' };
  },
};
