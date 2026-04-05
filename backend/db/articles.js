import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** cwd와 무관하게 기본은 backend/data. 운영: NW_ARTICLES_JSON_PATH로 Render Disk 등 영구 경로 지정 */
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const articlesPath = process.env.NW_ARTICLES_JSON_PATH
  ? resolve(process.env.NW_ARTICLES_JSON_PATH)
  : join(dataDir, 'articles.json');
const articlesDir = dirname(articlesPath);
if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });

let articles = [];
if (fs.existsSync(articlesPath)) {
  try {
    articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } catch {}
}
if (!Array.isArray(articles)) articles = [];

function save() {
  fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf8');
  if (process.env.NW_DEBUG === '1') {
    console.log('[articlesDb] write path=', articlesPath, 'rowCount=', articles.length);
  }
}

function nowStr() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

/** 저장용 상태: draft | submitted | published | rejected */
export function canonicalStoreStatus(s) {
  const x = (s == null ? '' : String(s)).trim().toLowerCase();
  if (x === 'pending' || x === 'sent' || x === 'submitted') return 'submitted';
  if (x === 'approved' || x === 'published') return 'published';
  if (x === 'rejected') return 'rejected';
  if (x === 'draft') return 'draft';
  return 'draft';
}

/** API/프론트에 내려주는 상태 (레거시 pending → submitted) */
export function toApiStatus(raw) {
  const x = (raw == null ? '' : String(raw)).trim().toLowerCase();
  if (x === 'pending' || x === 'sent' || x === 'submitted') return 'submitted';
  if (x === 'approved' || x === 'published') return 'published';
  if (x === 'rejected') return 'rejected';
  if (x === 'draft') return 'draft';
  return 'draft';
}

/** 메인 공개 목록과 GET /public/:id 허용 범위를 동일하게 유지하기 위한 단일 기준 */
export function isPublicFeedReadableStatus(raw) {
  const st = toApiStatus(raw);
  return st === 'published' || st === 'submitted';
}

function authorIdNorm(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapListFields(a) {
  return {
    id: a.id,
    title: a.title || '',
    subtitle: a.subtitle || '',
    category: a.category || '',
    author_id: a.author_id,
    author_name: a.author_name || '',
    summary: a.summary || '',
    status: toApiStatus(a.status),
    created_at: a.created_at || '',
    updated_at: a.updated_at || a.created_at || '',
    submitted_at: a.submitted_at || '',
    published_at: a.published_at || '',
    rejected_at: a.rejected_at || '',
    views: Number(a.views) || 0,
  };
}

function mapDetail(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title || '',
    subtitle: a.subtitle || '',
    author_name: a.author_name || '',
    author_id: a.author_id,
    category: a.category || '',
    content: a.content || '',
    content1: a.content1, content2: a.content2, content3: a.content3, content4: a.content4,
    image1: a.image1, image2: a.image2, image3: a.image3, image4: a.image4,
    image1_caption: a.image1_caption || '', image2_caption: a.image2_caption || '', image3_caption: a.image3_caption || '',
    image4_caption: a.image4_caption || '',
    status: toApiStatus(a.status),
    created_at: a.created_at || '',
    updated_at: a.updated_at || a.created_at || '',
    submitted_at: a.submitted_at || '',
    published_at: a.published_at || '',
    rejected_at: a.rejected_at || '',
    views: Number(a.views) || 0,
  };
}

/** 숫자 id 또는 slug(문자열)로 레코드 탐색 */
function resolveArticleRecord(id) {
  if (id == null || id === '') return null;
  const n = Number(id);
  if (Number.isFinite(n)) {
    return articles.find((x) => x.id === n) || null;
  }
  const s = String(id);
  return articles.find((x) => (x.slug || '') === s) || null;
}

function sortTimePublished(a) {
  const d = a.published_at || a.updated_at || a.created_at || '';
  const t = Date.parse(String(d).replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
}

/** 메인 최신 기사(게시+송고): 노출 시각 우선순위 */
function sortTimeMainFeed(a) {
  const d = a.published_at || a.submitted_at || a.updated_at || a.created_at || '';
  const t = Date.parse(String(d).replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
}

/**
 * 목록·메인 히어로: 이미지1만 사용 (작성 폼의 이미지 1 필드).
 * - 절대 URL, /uploads/…, uploads/…, data:image/* (작성 시 base64 업로드) 허용
 */
function publicListThumb(a) {
  const im = a.image1 || '';
  if (!im) return '';
  const s = String(im).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return s;
  if (s.startsWith('/')) return s;
  if (/^uploads\//i.test(s)) return '/' + s.replace(/^\/+/, '');
  if (/^data:image\//i.test(s)) return s;
  return '';
}

function mapPublishedListItem(a) {
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    published_at: a.published_at || a.updated_at || a.created_at || '',
    views: Number(a.views) || 0,
    thumb: publicListThumb(a),
  };
}

export const articlesDb = {
  /** 디버그·보고용: 메모리 기사 개수 */
  count() {
    return articles.length;
  },

  all() {
    return [...articles].reverse().map((a) => mapListFields(a));
  },

  /**
   * 메인 헤드라인·섹션·롤링: 게시(published) 또는 송고(submitted)만 (임시저장·반려 제외).
   * 정렬: published_at → submitted_at → updated_at → created_at
   */
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

  /** 전체기사 페이지: 페이지네이션 (페이지당 최대 20건) */
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

  /** 최근 N개월(30일×N) 게시 기사 중 조회수 상위 */
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

  /**
   * 기자 본인 기사. 레거시 행에 author_id 가 없고 작성자명만 있는 경우(샘플·이관 데이터)는
   * JWT name 과 author_name 이 같을 때만 포함해 메인 공개 노출과 목록이 어긋나 보이지 않게 한다.
   */
  findByAuthor(authorId, reporterDisplayName) {
    const want = authorIdNorm(authorId);
    if (want == null) return [];
    const nameWant = reporterDisplayName == null ? '' : String(reporterDisplayName).trim();
    return articles
      .filter((a) => {
        if (authorIdNorm(a.author_id) === want) return true;
        if (!nameWant) return false;
        const missingOwner =
          a.author_id == null || a.author_id === '' || authorIdNorm(a.author_id) == null;
        if (!missingOwner) return false;
        if (String(a.author_name || '').trim() !== nameWant) return false;
        return isPublicFeedReadableStatus(a.status);
      })
      .reverse()
      .map((a) => ({
        id: a.id,
        title: a.title || '',
        subtitle: a.subtitle || '',
        author_name: a.author_name || '',
        category: a.category || '',
        content: a.content || '',
        content1: a.content1, content2: a.content2, content3: a.content3, content4: a.content4,
        image1: a.image1, image2: a.image2, image3: a.image3, image4: a.image4,
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
      content1: data.content1 || '', content2: data.content2 || '', content3: data.content3 || '', content4: data.content4 || '',
      image1: data.image1 || '', image2: data.image2 || '', image3: data.image3 || '', image4: data.image4 || '',
      image1_caption: data.image1_caption || '', image2_caption: data.image2_caption || '', image3_caption: data.image3_caption || '',
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

  findById(id, authorId) {
    const a = resolveArticleRecord(id);
    if (!a) return null;
    if (authorId != null && authorIdNorm(a.author_id) !== authorIdNorm(authorId)) return null;
    return mapDetail(a);
  },

  /** 원본 레코드(디버그) */
  rawRecord(id) {
    return resolveArticleRecord(id);
  },

  update(id, authorId, data) {
    const a = resolveArticleRecord(id);
    if (!a || authorIdNorm(a.author_id) !== authorIdNorm(authorId)) return false;
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
};
