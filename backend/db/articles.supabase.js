import { assertSupabase } from '../lib/supabaseServer.js';
import { getUnifiedPublicFeedCached } from '../lib/unifiedPublicFeedCache.js';
import {
  nowStr,
  canonicalStoreStatus,
  toApiStatus,
  isPublicFeedReadableStatus,
  authorIdNorm,
  reporterOwnsArticleRecord,
  mapListFields,
  mapDetail,
  mapArticlePatchSnapshot,
  compareUnifiedPublicFeedDesc,
  mapPublishedListItem,
  mapPublishedListRowForPublicFeed,
  mapPublishedListHeroMinimal,
  rowToArticleRecord,
  normalizeTitleDedupeKey,
  dedupeWindowMs,
  popularWindowReferenceMs,
  comparePopularArticlesDesc,
  mainFeedArticleCap,
  normalizeReporterNameForFilter,
  formatSitemapLastMod,
} from './articles.shared.js';
import {
  articleMatchesSectionCategory,
  isKnownSectionCategoryParam,
} from '../lib/sectionCategoryFilter.js';
import { tracePublicFeedPresence } from '../lib/publicFeedTrace.js';

function sb() {
  return assertSupabase();
}

/**
 * Public feed SQL filter: PostgREST `.in()` is case-sensitive; `.or()` covers common DB casings.
 * Rows are still narrowed by isPublicFeedReadableStatus for API consistency.
 */
const OR_PUBLIC_FEED_STATUS =
  'status.eq.published,status.eq.approved,status.eq.Published,status.eq.Approved,status.eq.PUBLISHED,status.eq.APPROVED';

/** 목록·메인 피드용 — 본문/다중 이미지 제외 (SELECT * 금지) */
const PUBLISHED_LIST_SELECT =
  'id,title,category,author_name,created_at,published_at,submitted_at,updated_at,status,views,image1';

const STAFF_LIST_SELECT =
  'id,title,subtitle,category,author_id,author_name,summary,status,created_at,updated_at,submitted_at,published_at,rejected_at,views';

/**
 * Public list columns (no body). Main paths: bounded table articles only (never articles_list_slim).
 */
const MERGED_PUBLIC_FEED_SELECT =
  'id,title,category,author_name,summary,created_at,published_at,submitted_at,updated_at,status,views,image1,image2,image3,image4';

const POPULAR_WINDOW_SELECT =
  'id,title,category,author_name,published_at,created_at,views,image1';

const ROW_LIGHT_SELECT =
  'id,title,author_id,author_name,status,submitted_at,published_at,rejected_at';

const PATCH_RETURN_COLS =
  'id,title,subtitle,summary,author_name,author_id,category,status,created_at,updated_at,submitted_at,published_at,rejected_at,views';

const FULL_ARTICLE_SELECT =
  'id,title,subtitle,author_id,author_name,category,content,content1,content2,content3,content4,image1,image2,image3,image4,image1_caption,image2_caption,image3_caption,image4_caption,summary,status,created_at,updated_at,submitted_at,published_at,rejected_at,views';

const RAW_GATE_SELECT = 'id,author_id,author_name,status';

async function selectAllListRows() {
  const { data, error } = await sb().from('articles').select(STAFF_LIST_SELECT).order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToArticleRecord);
}

async function resolveArticleRecord(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (Number.isFinite(n)) {
    const { data, error } = await sb().from('articles').select(FULL_ARTICLE_SELECT).eq('id', n).maybeSingle();
    if (error) throw error;
    return rowToArticleRecord(data);
  }
  return null;
}

async function resolveArticleRowLight(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const { data, error } = await sb().from('articles').select(ROW_LIGHT_SELECT).eq('id', n).maybeSingle();
  if (error) throw error;
  return data ? rowToArticleRecord(data) : null;
}

/** 승인·게시 행만 JS에서 통일 정렬된 배열 (서버 캐시 + 무효화는 unifiedPublicFeedCache). */
async function loadUnifiedPublicFeedRecordsFromDatabase() {
  const pageSize = 1000;
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb()
      .from('articles')
      .select(MERGED_PUBLIC_FEED_SELECT)
      .or(OR_PUBLIC_FEED_STATUS)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = data || [];
    if (chunk.length === 0) break;
    for (const r of chunk) {
      out.push(rowToArticleRecord(r));
    }
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  const filtered = out.filter((a) => isPublicFeedReadableStatus(a.status));
  filtered.sort((x, y) => compareUnifiedPublicFeedDesc(x, y));
  return filtered;
}

export const articlesDb = {
  async count() {
    const { count, error } = await sb().from('articles').select('id', { count: 'exact', head: true });
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
    const rows = await selectAllListRows();
    return rows.map((a) => mapListFields(a));
  },

  /**
   * Full merged feed (cached). For /public/page etc. Not used for /public/latest or headlines.
   */
  async getUnifiedPublicFeedRecords() {
    return getUnifiedPublicFeedCached(() => loadUnifiedPublicFeedRecordsFromDatabase());
  },

  /** Headlines: same ordering as unified public feed cache (single source). */
  async listPublishedLatestHero(limit) {
    const lim = Math.min(15, Math.max(1, Number(limit) || 5));
    const all = await this.getUnifiedPublicFeedRecords();
    return all.slice(0, lim).map((a) => mapPublishedListHeroMinimal(a));
  },

  /** 메인·GET /api/articles/public/list·GET /api/home — unified feed slice only */
  async listPublishedLatest(limit) {
    const cap = mainFeedArticleCap();
    const lim = Math.min(cap, Math.max(1, Number(limit) || 10));
    const all = await this.getUnifiedPublicFeedRecords();
    return all.slice(0, lim).map((a) => mapPublishedListRowForPublicFeed(a));
  },

  async listPublishedForMain() {
    return this.listPublishedLatest(mainFeedArticleCap());
  },

  async listPublishedPaginated(page, pageSize, titleQuery, sectionCategory, opts) {
    const size = Math.min(50, Math.max(1, Number(pageSize) || 20));
    const p = Math.max(1, Number(page) || 1);
    const catRaw = sectionCategory != null ? String(sectionCategory).trim() : '';
    if (catRaw && !isKnownSectionCategoryParam(catRaw)) {
      return { items: [], total: 0, page: p, pageSize: size, totalPages: 1 };
    }
    const o = opts && typeof opts === 'object' ? opts : {};
    const authorRaw = o.authorName != null ? String(o.authorName).trim() : '';
    const excludeRaw = o.excludeId != null ? String(o.excludeId).trim() : '';
    const unified = await this.getUnifiedPublicFeedRecords();
    let all = unified.filter((a) => toApiStatus(a.status) === 'published');
    if (catRaw) {
      all = all.filter((a) => articleMatchesSectionCategory(a.category, catRaw));
    }
    const needle = titleQuery != null ? String(titleQuery).trim().toLowerCase() : '';
    if (needle) {
      all = all.filter((a) => String(a.title || '').toLowerCase().includes(needle));
    }
    if (authorRaw) {
      const want = normalizeReporterNameForFilter(authorRaw);
      if (want) {
        all = all.filter((a) => normalizeReporterNameForFilter(a.author_name) === want);
      }
    }
    if (excludeRaw) {
      all = all.filter((a) => String(a.id) !== excludeRaw);
    }
    const total = all.length;
    const start = (p - 1) * size;
    const slice = all.slice(start, start + size);
    const items = slice.map((a) => mapPublishedListItem(a));
    return {
      items,
      total,
      page: p,
      pageSize: size,
      totalPages: Math.max(1, Math.ceil(total / size) || 1),
    };
  },

  async listPublishedSitemapRows() {
    const { data, error } = await sb()
      .from('articles')
      .select('id,updated_at,published_at,created_at')
      .eq('status', 'published')
      .order('id', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: Number(r.id),
      lastmod: formatSitemapLastMod(r.updated_at || r.published_at || r.created_at),
    }));
  },

  async listPublishedPopularSince(sinceMs, limit, sectionCategory) {
    const since = Number(sinceMs);
    const lim = Math.min(50, Math.max(1, Number(limit) || 10));
    if (!Number.isFinite(since)) return [];
    const catRaw = sectionCategory != null ? String(sectionCategory).trim() : '';
    if (catRaw && !isKnownSectionCategoryParam(catRaw)) return [];
    const sinceIso = new Date(since).toISOString();
    /* Direct articles; DB pre-sort views desc then published_at desc; JS comparePopularArticlesDesc is authoritative */
    const fetchCap = Math.min(80, Math.max(lim * 4, 32));
    let q = sb()
      .from('articles')
      .select(POPULAR_WINDOW_SELECT)
      .or(OR_PUBLIC_FEED_STATUS)
      .gte('published_at', sinceIso)
      .order('views', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(fetchCap);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data || []).map(rowToArticleRecord);
    if (String(process.env.NW_HOME_POPULAR_INCLUDE_NULL_PUB_AT || '').trim() === '1') {
      const { data: d2, error: e2 } = await sb()
        .from('articles')
        .select(POPULAR_WINDOW_SELECT)
        .or(OR_PUBLIC_FEED_STATUS)
        .is('published_at', null)
        .gte('created_at', sinceIso)
        .order('views', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(24);
      if (!e2 && d2 && d2.length) {
        const seen = new Set(rows.map((r) => r.id));
        for (const r of d2) {
          const rec = rowToArticleRecord(r);
          if (!seen.has(rec.id)) {
            rows.push(rec);
            seen.add(rec.id);
          }
        }
      }
    }
    return rows
      .filter((a) => !catRaw || articleMatchesSectionCategory(a.category, catRaw))
      .filter((a) => {
        const ref = popularWindowReferenceMs(a);
        return ref != null && ref >= since;
      })
      .sort(comparePopularArticlesDesc)
      .slice(0, lim)
      .map((a) => mapPublishedListItem(a));
  },

  async listPublishedPopularByMonths(months, limit, sectionCategory) {
    const m = Math.max(1, Math.min(24, Number(months) || 3));
    const sinceMs = Date.now() - m * 30 * 24 * 60 * 60 * 1000;
    return this.listPublishedPopularSince(sinceMs, limit, sectionCategory);
  },

  async findByAuthor(authorId, reporterDisplayName) {
    const want = authorIdNorm(authorId);
    if (want == null) return [];
    const nameWant = reporterDisplayName == null ? '' : String(reporterDisplayName).trim();
    const { data, error } = await sb()
      .from('articles')
      .select(STAFF_LIST_SELECT)
      .eq('author_id', want)
      .order('id', { ascending: false });
    if (error) throw error;
    let rows = (data || []).map(rowToArticleRecord);
    if (nameWant) {
      const { data: d2, error: e2 } = await sb()
        .from('articles')
        .select(STAFF_LIST_SELECT)
        .is('author_id', null)
        .eq('author_name', nameWant)
        .order('id', { ascending: false });
      if (!e2 && d2 && d2.length) {
        const seen = new Set(rows.map((r) => r.id));
        for (const r of d2) {
          const rec = rowToArticleRecord(r);
          if (!seen.has(rec.id)) {
            rows.push(rec);
            seen.add(rec.id);
          }
        }
        rows.sort((a, b) => b.id - a.id);
      }
    }
    return rows.filter((a) => reporterOwnsArticleRecord(a, want, nameWant)).map((a) => mapListFields(a));
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
    const { data: inserted, error } = await sb().from('articles').insert(row).select(FULL_ARTICLE_SELECT).single();
    if (error) throw error;
    const rec = rowToArticleRecord(inserted);
    if (process.env.NW_DEBUG === '1') console.log('[articlesDb] supabase insert id=', rec.id);
    return mapDetail(rec);
  },

  async authorIdForArticle(id) {
    const n = Number(id);
    if (!Number.isFinite(n)) return null;
    const { data, error } = await sb().from('articles').select('author_id').eq('id', n).maybeSingle();
    if (error) throw error;
    return data && data.author_id != null ? data.author_id : null;
  },

  async incrementPublicViews(id) {
    const n = Number(id);
    if (!Number.isFinite(n)) return null;
    const { data: row0, error: e0 } = await sb()
      .from('articles')
      .select('id,status,views')
      .eq('id', n)
      .maybeSingle();
    if (e0) throw e0;
    if (!row0) return null;
    const a = rowToArticleRecord(row0);
    if (toApiStatus(a.status) !== 'published') return null;
    const views = Number(a.views || 0) + 1;
    const upd = { views, updated_at: nowStr() };
    const { data, error } = await sb().from('articles').update(upd).eq('id', n).select(FULL_ARTICLE_SELECT).single();
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
    if (id == null || id === '') return null;
    const n = Number(id);
    if (!Number.isFinite(n)) return null;
    const { data, error } = await sb().from('articles').select(RAW_GATE_SELECT).eq('id', n).maybeSingle();
    if (error) throw error;
    return data ? rowToArticleRecord(data) : null;
  },

  async recordLightForPatch(id) {
    return resolveArticleRowLight(id);
  },

  async update(id, authorId, data, reporterDisplayName) {
    const a = await resolveArticleRowLight(id);
    if (!a || !reporterOwnsArticleRecord(a, authorId, reporterDisplayName)) return { ok: false };
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
    const { data: updated, error } = await sb()
      .from('articles')
      .update(patch)
      .eq('id', a.id)
      .select(PATCH_RETURN_COLS)
      .single();
    if (error) throw error;
    return { ok: true, article: mapArticlePatchSnapshot(rowToArticleRecord(updated)) };
  },

  async updateByStaff(id, data) {
    const a = await resolveArticleRowLight(id);
    if (!a) return { ok: false };
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
    const { data: updated, error } = await sb()
      .from('articles')
      .update(patch)
      .eq('id', a.id)
      .select(PATCH_RETURN_COLS)
      .single();
    if (error) throw error;
    return { ok: true, article: mapArticlePatchSnapshot(rowToArticleRecord(updated)) };
  },

  async updateStatus(id, status) {
    const a = await resolveArticleRowLight(id);
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
    const n = Number(id);
    if (!Number.isFinite(n)) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const { data: rowA, error: errA } = await sb().from('articles').select(PATCH_RETURN_COLS).eq('id', n).maybeSingle();
    if (errA) throw errA;
    const a = rowA ? rowToArticleRecord(rowA) : null;
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'published') return { ok: true, idempotent: true, article: mapArticlePatchSnapshot(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 승인할 수 있습니다.' };
    const now = nowStr();
    /** DB에 저장된 status 문자열과 정확히 일치해야 함(.in('submitted',…)은 대소문자 불일치 시 0행 갱신) */
    const rawStatus = String(a.status ?? '').trim();
    const { data, error } = await sb()
      .from('articles')
      .update({
        status: 'published',
        published_at: a.published_at && String(a.published_at).trim() ? a.published_at : now,
        updated_at: now,
      })
      .eq('id', n)
      .eq('status', rawStatus)
      .select(PATCH_RETURN_COLS)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const rec = rowToArticleRecord(data);
      tracePublicFeedPresence(
        'db.row.afterApprove',
        [{ id: rec.id, title: rec.title, status: rec.status, published_at: rec.published_at }],
        { rawStatusBefore: rawStatus },
      );
      if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
        console.log(
          '[nw/publish]',
          JSON.stringify({
            id: n,
            title: String(rec.title || '').slice(0, 200),
            statusBefore: rawStatus,
            statusAfter: toApiStatus(rec.status),
            published_at: rec.published_at,
          }),
        );
      }
      return { ok: true, article: mapArticlePatchSnapshot(rec) };
    }
    const { data: rowAgainA, error: errAgainA } = await sb()
      .from('articles')
      .select(PATCH_RETURN_COLS)
      .eq('id', n)
      .maybeSingle();
    if (!errAgainA && rowAgainA) {
      const again = rowToArticleRecord(rowAgainA);
      if (again && toApiStatus(again.status) === 'published')
        return { ok: true, idempotent: true, article: mapArticlePatchSnapshot(again) };
    }
    return { ok: false, http: 409, error: '이미 처리되었거나 승인할 수 없는 상태입니다.' };
  },

  async rejectFromSubmitted(id) {
    const n = Number(id);
    if (!Number.isFinite(n)) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const { data: rowA, error: errA } = await sb().from('articles').select(PATCH_RETURN_COLS).eq('id', n).maybeSingle();
    if (errA) throw errA;
    const a = rowA ? rowToArticleRecord(rowA) : null;
    if (!a) return { ok: false, http: 404, error: '기사를 찾을 수 없습니다.' };
    const st = toApiStatus(a.status);
    if (st === 'rejected') return { ok: true, idempotent: true, article: mapArticlePatchSnapshot(a) };
    if (st !== 'submitted')
      return { ok: false, http: 400, error: '송고·검토 대기 상태의 기사만 반려할 수 있습니다.' };
    const now = nowStr();
    const rawStatus = String(a.status ?? '').trim();
    const { data, error } = await sb()
      .from('articles')
      .update({
        status: 'rejected',
        rejected_at: a.rejected_at && String(a.rejected_at).trim() ? a.rejected_at : now,
        updated_at: now,
      })
      .eq('id', n)
      .eq('status', rawStatus)
      .select(PATCH_RETURN_COLS)
      .maybeSingle();
    if (error) throw error;
    if (data) return { ok: true, article: mapArticlePatchSnapshot(rowToArticleRecord(data)) };
    const { data: rowAgain, error: errAgain } = await sb()
      .from('articles')
      .select(PATCH_RETURN_COLS)
      .eq('id', n)
      .maybeSingle();
    if (!errAgain && rowAgain) {
      const again = rowToArticleRecord(rowAgain);
      if (again && toApiStatus(again.status) === 'rejected')
        return { ok: true, idempotent: true, article: mapArticlePatchSnapshot(again) };
    }
    return { ok: false, http: 409, error: '이미 처리되었거나 반려할 수 없는 상태입니다.' };
  },
};
