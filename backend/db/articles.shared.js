/** 기사 도메인 순수 헬퍼 — 레거시 JSON DB / Supabase 공통 */

/** 송고/게시 중복 판별용 제목 정규화 */
export function normalizeTitleDedupeKey(title) {
  return String(title ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function dedupeWindowMs() {
  const n = Number(process.env.NW_ARTICLE_DEDUPE_WINDOW_MS);
  if (Number.isFinite(n) && n >= 5000 && n <= 600000) return n;
  return 120000;
}

/** 메인 피드(공개 list)에서 한 번에 내려줄 최대 게시 건수 — 본문 제외 컬럼만 조회하더라도 상한을 둔다 */
export function mainFeedArticleCap() {
  const n = Number(process.env.NW_MAIN_FEED_MAX_ARTICLES);
  if (Number.isFinite(n) && n >= 20 && n <= 2000) return Math.floor(n);
  return 400;
}

export function nowStr() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function canonicalStoreStatus(s) {
  const x = (s == null ? '' : String(s)).trim().toLowerCase();
  if (x === 'pending' || x === 'sent' || x === 'submitted') return 'submitted';
  if (x === 'approved' || x === 'published') return 'published';
  if (x === 'rejected') return 'rejected';
  if (x === 'draft') return 'draft';
  return 'draft';
}

export function toApiStatus(raw) {
  const x = (raw == null ? '' : String(raw)).trim().toLowerCase();
  if (x === 'pending' || x === 'sent' || x === 'submitted') return 'submitted';
  if (x === 'approved' || x === 'published') return 'published';
  if (x === 'rejected') return 'rejected';
  if (x === 'draft') return 'draft';
  return 'draft';
}

/** 메인·공개 API: 편집장 승인 후 게시된 기사만 (송고·임시저장·반려는 비공개) */
export function isPublicFeedReadableStatus(raw) {
  const st = toApiStatus(raw);
  return st === 'published';
}

/** author_id 없이 이름만 맞는 레거시 행: 기자 대시보드에서 본인 글로 인정할 상태 */
export function isReporterArticleOwnershipFallbackStatus(raw) {
  const st = toApiStatus(raw);
  return st === 'draft' || st === 'submitted' || st === 'published' || st === 'rejected';
}

export function authorIdNorm(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isMissingAuthorIdRecord(a) {
  return a.author_id == null || a.author_id === '' || authorIdNorm(a.author_id) == null;
}

export function normalizeReporterNameForFilter(name) {
  let s = String(name == null ? '' : name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  s = s.replace(/\s*기자\s*$/u, '').trim();
  return s;
}

export function reporterOwnsArticleRecord(a, reporterId, reporterDisplayName) {
  if (!a) return false;
  if (authorIdNorm(a.author_id) === authorIdNorm(reporterId)) return true;
  if (!isMissingAuthorIdRecord(a)) return false;
  const nameWant = reporterDisplayName == null ? '' : String(reporterDisplayName).trim();
  if (!nameWant) return false;
  if (String(a.author_name || '').trim() !== nameWant) return false;
  return isReporterArticleOwnershipFallbackStatus(a.status);
}

export function mapListFields(a) {
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

/** Save PATCH response: metadata only (no body/images; client merges into local state). */
export function mapArticlePatchSnapshot(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title || '',
    subtitle: a.subtitle || '',
    summary: a.summary || '',
    author_name: a.author_name || '',
    author_id: a.author_id,
    category: a.category || '',
    status: toApiStatus(a.status),
    created_at: a.created_at || '',
    updated_at: a.updated_at || a.created_at || '',
    submitted_at: a.submitted_at || '',
    published_at: a.published_at || '',
    rejected_at: a.rejected_at || '',
    views: Number(a.views) || 0,
  };
}

export function mapDetail(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title || '',
    subtitle: a.subtitle || '',
    summary: a.summary || '',
    author_name: a.author_name || '',
    author_id: a.author_id,
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
    image1_caption: a.image1_caption || '',
    image2_caption: a.image2_caption || '',
    image3_caption: a.image3_caption || '',
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

/** ISO / 'YYYY-MM-DD HH:mm:ss' 등 파싱 (무효면 NaN) */
export function parseArticleDateMs(v) {
  if (v == null || v === '') return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  if (!s.includes('T') && /^\d{4}-\d{2}-\d{2}\s/.test(s)) s = s.replace(' ', 'T');
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}

/** sitemap `<lastmod>` date (YYYY-MM-DD) */
export function formatSitemapLastMod(v) {
  if (v == null || v === '') return '';
  const ms = parseArticleDateMs(v);
  if (!Number.isFinite(ms)) {
    const s = String(v).trim();
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  }
  const d = new Date(ms);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/**
 * 인기 기사 시간�도우: 게시일 우선, 없으면 작성일 (updated_at 미사용)
 * @returns {number|null} epoch ms or null if unusable
 */
export function popularWindowReferenceMs(a) {
  if (!a) return null;
  let t = parseArticleDateMs(a.published_at);
  if (Number.isFinite(t)) return t;
  t = parseArticleDateMs(a.created_at);
  return Number.isFinite(t) ? t : null;
}

/** 조회수 내림차순 → 게시일 → 작성일 (동률 시 최신 우선) */
export function comparePopularArticlesDesc(x, y) {
  const vx = Number(x.views) || 0;
  const vy = Number(y.views) || 0;
  if (vy !== vx) return vy - vx;
  const px = parseArticleDateMs(x.published_at);
  const py = parseArticleDateMs(y.published_at);
  const pnx = Number.isFinite(px) ? px : 0;
  const pny = Number.isFinite(py) ? py : 0;
  if (pny !== pnx) return pny - pnx;
  const cx = parseArticleDateMs(x.created_at);
  const cy = parseArticleDateMs(y.created_at);
  const cnx = Number.isFinite(cx) ? cx : 0;
  const cny = Number.isFinite(cy) ? cy : 0;
  return cny - cnx;
}

export function sortTimePublished(a) {
  const d = a.published_at || a.updated_at || a.created_at || '';
  const t = Date.parse(String(d).replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
}

export function sortTimeMainFeed(a) {
  const d = a.published_at || a.submitted_at || a.updated_at || a.created_at || '';
  const t = Date.parse(String(d).replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
}

/** Max length for data: URIs in public thumb/hero (env NW_PUBLIC_DATA_IMAGE_MAX_CHARS, hard cap 12MB). */
export function publicDataUriMaxChars() {
  const cap = Number(process.env.NW_PUBLIC_DATA_IMAGE_MAX_CHARS);
  if (Number.isFinite(cap) && cap > 0) return Math.min(12_000_000, cap);
  return 5_000_000;
}

/**
 * Normalize a single candidate string for public list/hero thumbs.
 * - http(s), //, /path, uploads/… allowed
 * - data: allowed up to publicDataUriMaxChars() (default ~5MB) for large single-image articles
 */
function normalizePublicThumbString(s) {
  if (s == null || s === '') return '';
  let t = String(s).trim().replace(/^\uFEFF/, '');
  if (!t) return '';
  if (/^data:/i.test(t)) {
    const max = publicDataUriMaxChars();
    if (t.length > max) return '';
    return t;
  }
  if (t.length > 2048) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('//')) return t;
  if (t.startsWith('/')) return t;
  if (/^uploads\//i.test(t)) return '/' + t.replace(/^\/+/, '');
  return '';
}

const HERO_RAW_IMAGE_KEYS = [
  'imageUrl',
  'image_url',
  'heroImageUrl',
  'hero_image_url',
  'thumbnailUrl',
  'thumbnail_url',
  'image1',
  'image2',
  'image3',
  'image4',
  'thumb',
];

/* Deduped + normalized: non-data URLs first, then data URIs by ascending length; max 3 for client fallback. */
export function listHeroImageCandidates(a) {
  if (!a || typeof a !== 'object') return [];
  const seen = new Set();
  const out = [];
  for (const key of HERO_RAW_IMAGE_KEYS) {
    const raw = a[key];
    if (raw == null || raw === '') continue;
    const norm = normalizePublicThumbString(raw);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  out.sort((x, y) => {
    const dx = /^data:/i.test(x);
    const dy = /^data:/i.test(y);
    if (dx !== dy) return dx ? 1 : -1;
    return x.length - y.length;
  });
  return out.slice(0, 3);
}

/** Public list/home: first entry from listHeroImageCandidates (preferred URL or smallest data). */
export function publicListThumb(a) {
  const c = listHeroImageCandidates(a);
  return c.length ? c[0] : '';
}

const PUBLIC_LIST_DROP_KEYS = new Set([
  'content',
  'content1',
  'content2',
  'content3',
  'content4',
  'summary',
  'subtitle',
  'image1',
  'image2',
  'image3',
  'image4',
  'image1_caption',
  'image2_caption',
  'image3_caption',
  'image4_caption',
]);

/** Strip body/images from a row before JSON for /public/list|latest|page|home bundles. */
export function sanitizeForPublicListPayload(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = { ...obj };
  for (const k of PUBLIC_LIST_DROP_KEYS) {
    if (k in out) delete out[k];
  }
  const th = out.thumb != null ? String(out.thumb).trim() : '';
  if (th) {
    const dataMax = publicDataUriMaxChars();
    if (/^data:/i.test(th)) {
      if (th.length > dataMax) delete out.thumb;
    } else if (th.length > 2048) {
      delete out.thumb;
    }
  }
  return out;
}

export function sanitizeForPublicListPayloadArr(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((x) => sanitizeForPublicListPayload(x));
}

/** 히어로 응답만 허용 필드로 고정(잘못된 중간 객체·data URL 유입 방지) */
export function sanitizeHeroPublicResponseArr(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => {
    const row = r && typeof r === 'object' ? r : {};
    const pre = Array.isArray(row.heroImageCandidates)
      ? row.heroImageCandidates.filter((s) => typeof s === 'string' && s.trim())
      : [];
    const candidates = pre.length > 0 ? pre : listHeroImageCandidates(row);
    const u = candidates.length ? candidates[0] : '';
    return {
      id: Number(r.id),
      title: String(r.title ?? '').slice(0, 2000),
      category: String(r.category ?? ''),
      author_name: String(r.author_name ?? ''),
      created_at: String(r.created_at ?? ''),
      published_at: String(r.published_at ?? ''),
      submitted_at: String(r.submitted_at ?? ''),
      status: toApiStatus(r.status),
      thumb: u,
      imageUrl: u,
      heroImageCandidates: candidates,
    };
  });
}

/** 홈 첫 페인트용 — id·제목·분류·날짜·썸네일 URL만 (필드 최소) */
export function mapPublishedListHeroMinimal(a) {
  const candidates = listHeroImageCandidates(a);
  const url = candidates.length ? candidates[0] : '';
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    created_at: a.created_at || '',
    published_at: a.published_at || '',
    submitted_at: a.submitted_at || '',
    status: toApiStatus(a.status),
    thumb: url,
    imageUrl: url,
    heroImageCandidates: candidates,
  };
}

/** Public list/latest/home: no subtitle; sort timestamps + thumb only */
export function mapPublishedListRowForPublicFeed(a) {
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    created_at: a.created_at || '',
    published_at: a.published_at || '',
    submitted_at: a.submitted_at || '',
    updated_at: a.updated_at || '',
    status: toApiStatus(a.status),
    views: Number(a.views) || 0,
    thumb: publicListThumb(a),
  };
}

export function mapPublishedListItem(a) {
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

/** DB/JSON row → API용 표시 문자열(날짜) */
export function formatTs(v) {
  if (v == null || v === '') return '';
  const s = String(v);
  if (s.includes('T')) return s.replace('T', ' ').slice(0, 19);
  return s.slice(0, 19);
}

/** Supabase row → 앱 레코드 형태 */
export function rowToArticleRecord(r) {
  if (!r) return null;
  return {
    id: Number(r.id),
    title: r.title ?? '',
    subtitle: r.subtitle ?? '',
    author_id: r.author_id != null ? Number(r.author_id) : null,
    author_name: r.author_name ?? '',
    category: r.category ?? '',
    content: r.content ?? '',
    content1: r.content1 ?? '',
    content2: r.content2 ?? '',
    content3: r.content3 ?? '',
    content4: r.content4 ?? '',
    image1: r.image1 ?? '',
    image2: r.image2 ?? '',
    image3: r.image3 ?? '',
    image4: r.image4 ?? '',
    image1_caption: r.image1_caption ?? '',
    image2_caption: r.image2_caption ?? '',
    image3_caption: r.image3_caption ?? '',
    image4_caption: r.image4_caption ?? '',
    summary: r.summary ?? '',
    status: r.status ?? 'draft',
    created_at: formatTs(r.created_at),
    updated_at: formatTs(r.updated_at),
    submitted_at: formatTs(r.submitted_at),
    published_at: formatTs(r.published_at),
    rejected_at: formatTs(r.rejected_at),
    views: Number(r.views) || 0,
  };
}
