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

export function mapDetail(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title || '',
    subtitle: a.subtitle || '',
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

export function publicListThumb(a) {
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
