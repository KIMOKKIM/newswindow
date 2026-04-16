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
    coverImageKey: a.coverImageKey || a.cover_image_key || '',
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

/**
 * 공개 피드 단일 정렬 키: published_at → updated_at → created_at (ms).
 * 서버·프론트 모두 동일 우선순위 유지.
 */
export function computeUnifiedPublicFeedSortMs(a) {
  if (!a) return 0;
  const d = a.published_at || a.updated_at || a.created_at || '';
  const t = Date.parse(String(d).replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
}

/** 내림차순: 더 최신이 앞 (동률 시 id 큰 쪽) */
export function compareUnifiedPublicFeedDesc(a, b) {
  const tb = computeUnifiedPublicFeedSortMs(b);
  const ta = computeUnifiedPublicFeedSortMs(a);
  if (tb !== ta) return tb - ta;
  return Number(b.id) - Number(a.id);
}

/** @deprecated 이름 호환 — 내부는 computeUnifiedPublicFeedSortMs 와 동일 */
export function sortTimePublished(a) {
  return computeUnifiedPublicFeedSortMs(a);
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
  // Host-relative Supabase URL saved without scheme (e.g. xxx.supabase.co/storage/v1/...)
  if (/^[a-z0-9][-a-z0-9.]*\.supabase\.co\/storage\//i.test(t)) {
    return 'https://' + t.replace(/^\/+/, '');
  }
  if (t.startsWith('//')) return t;
  const supabaseBase = () =>
    String(process.env.SUPABASE_URL || process.env.NW_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  // Site-relative Supabase paths (wrong host if left as "/storage/...")
  if (t.startsWith('/')) {
    if (/^\/storage\/v1\//i.test(t) || /^\/object\/(public|sign)\//i.test(t)) {
      const base = supabaseBase();
      if (base) return `${base}${t}`;
    }
    return t;
  }
  // Supabase Storage path without host (e.g. object/public/bucket/key)
  if (/^object\/(public|sign)\//i.test(t) || /^storage\/v1\//i.test(t)) {
    const base = supabaseBase();
    if (base) {
      const path = t.replace(/^\/+/, '');
      return /^storage\/v1\//i.test(path) ? `${base}/${path}` : `${base}/storage/v1/${path}`;
    }
  }
  if (/^uploads\//i.test(t)) return '/' + t.replace(/^\/+/, '');
  return '';
}

/**
 * Resolve a single canonical card image URL for article cards.
 * Priority:
 *  1) coverImageKey -> corresponding image slot (image1..image4)
 *  2) image1
 *  3) image2
 *  4) image3
 *  5) image4
 *  6) primaryImage
 *  7) thumb
 *  8) imageUrl
 *  9) image_url
 * 10) ''
 */
export function resolveCardImage(a) {
  try {
    if (!a || typeof a !== 'object') return '';
    const pick = (v) => {
      if (v == null) return '';
      const s = String(v || '').trim();
      if (!s) return '';
      const n = normalizePublicThumbString(s);
      return n || s;
    };
    // 1) coverImageKey
    const coverKey = (a && (a.coverImageKey || a.cover_image_key)) || '';
    if (coverKey && typeof coverKey === 'string') {
      const slot = a[coverKey];
      const p = pick(slot);
      if (p) return p;
    }
    // 2-5) image1..image4
    for (const n of [1, 2, 3, 4]) {
      const v = a['image' + n];
      const p = pick(v);
      if (p) return p;
    }
    // 6-9) other fallbacks
    const fallbacks = ['primaryImage', 'thumb', 'imageUrl', 'image_url'];
    for (const k of fallbacks) {
      const v = a[k];
      const p = pick(v);
      if (p) return p;
    }
  } catch (_e) {}
  return '';
}

const HERO_RAW_IMAGE_KEYS = [
  'hero_image',
  'heroImage',
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

/**
 * 목록·홈·인기 JSON: data URI 제외 — http(s)·경로 썸네일만 (대용량 base64 응답 방지)
 */
export function publicThumbUrlOnly(a) {
  const cands = listHeroImageCandidates(a);
  for (const u of cands) {
    if (u && !/^data:/i.test(String(u))) return u;
  }
  return '';
}

function stripDataUriThumbString(th) {
  const s = th != null ? String(th).trim() : '';
  if (!s || /^data:/i.test(s)) return '';
  return s;
}

const PUBLIC_LIST_DROP_KEYS = new Set([
  'content',
  'content1',
  'content2',
  'content3',
  'content4',
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

  // Ensure a stable, explicit primary image is present for public list/home payloads.
  // Priority:
  //  1) image1 (explicit article field)
  //  2) existing thumb/imageUrl fields
  //  3) other hero candidates (image2.., hero fields)
  //  4) data URI fallback (limited by publicDataUriMaxChars)
  try {
    // Prefer explicit cover selection when present (coverImageKey -> imageN).
    const coverKey = (obj && (obj.coverImageKey || obj.cover_image_key)) || '';
    let primary = '';
    if (coverKey && typeof coverKey === 'string' && obj && obj[coverKey]) {
      const rawCover = String(obj[coverKey] || '').trim();
      primary = rawCover ? normalizePublicThumbString(rawCover) : '';
    }
    // Prefer raw image1 when available and normalize it (if no cover selection).
    if (!primary) {
      const rawImage1 = obj && obj.image1 ? String(obj.image1).trim() : '';
      primary = rawImage1 ? normalizePublicThumbString(rawImage1) : '';
    }

    // If no valid image1, use existing thumb/imageUrl or first non-data candidate.
    if (!primary) {
      const existingThumb = obj && obj.thumb ? String(obj.thumb).trim() : '';
      const existingImageUrl = obj && (obj.imageUrl || obj.image_url) ? String(obj.imageUrl || obj.image_url).trim() : '';
      if (existingThumb) primary = normalizePublicThumbString(existingThumb);
      if (!primary && existingImageUrl) primary = normalizePublicThumbString(existingImageUrl);
    }

    // Still missing: derive from hero image candidates (this will check image2.. and other keys)
    if (!primary) {
      const cands = listHeroImageCandidates(obj);
      for (const u of cands) {
        if (!u) continue;
        // prefer non-data URLs first
        if (!/^data:/i.test(u)) {
          primary = u;
          break;
        }
        if (!primary) primary = u;
      }
    }

    // Apply primary into normalized fields so front-end always has a reliable key to read.
    if (primary) {
      // Force-unify all public-facing image keys to the same normalized primary value.
      // Do not only set when empty — overwrite to ensure image1 takes precedence.
      const normPrimary = normalizePublicThumbString(primary) || primary;
      // Validate normalized primary (may become empty string if invalid).
      const finalPrimary = normPrimary && String(normPrimary).trim() ? normPrimary : '';
      if (finalPrimary) {
        out.thumb = finalPrimary;
        out.imageUrl = finalPrimary;
        out.image_url = finalPrimary;
        out.primaryImage = finalPrimary;
        out.cardImage = finalPrimary;
      } else {
        // Ensure keys are not left with invalid values.
        if ('thumb' in out) delete out.thumb;
        if ('imageUrl' in out) delete out.imageUrl;
        if ('image_url' in out) delete out.image_url;
        if ('primaryImage' in out) delete out.primaryImage;
        if ('cardImage' in out) delete out.cardImage;
      }
    }
  } catch (e) {
    // non-fatal: proceed with best-effort below
  }

  // Remove heavy/body/image raw fields that should not be included in public list payloads.
  for (const k of PUBLIC_LIST_DROP_KEYS) {
    if (k in out) delete out[k];
  }

  // Validate public image fields: drop data URIs (when not allowed), overly long values, or empty strings.
  const publicImageKeys = ['thumb', 'imageUrl', 'image_url', 'primaryImage'];
  for (const k of publicImageKeys) {
    if (!(k in out)) continue;
    const v = out[k] != null ? String(out[k]).trim() : '';
    if (!v) {
      delete out[k];
      continue;
    }
    // normalizePublicThumbString will return '' for invalid/oversized data URIs or invalid paths
    const nv = normalizePublicThumbString(v);
    if (!nv) {
      delete out[k];
      continue;
    }
    // Also ensure nv isn't longer than reasonable public URL length
    if (nv.length > 2048) {
      delete out[k];
      continue;
    }
    // Keep normalized value
    out[k] = nv;
  }

  return out;
}

export function sanitizeForPublicListPayloadArr(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((x) => sanitizeForPublicListPayload(x));
}

/** 히어로 응답만 허용 필드로 고정 — data URI 제외·URL 후보만 */
export function sanitizeHeroPublicResponseArr(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r) => {
    const row = r && typeof r === 'object' ? r : {};
    const pre = Array.isArray(row.heroImageCandidates)
      ? row.heroImageCandidates.filter((s) => typeof s === 'string' && s.trim())
      : [];
    const rawCands = pre.length > 0 ? pre : listHeroImageCandidates(row);
    const urlCandidates = rawCands.filter((s) => s && !/^data:/i.test(String(s))).slice(0, 3);
    const u = urlCandidates[0] || '';
    return {
      id: Number(r.id),
      title: String(r.title ?? '').slice(0, 2000),
      category: String(r.category ?? ''),
      author_name: String(r.author_name ?? ''),
      published_at: String(r.published_at ?? ''),
      thumb: u,
      imageUrl: u,
      primaryImage: u,
      cardImage: u,
      heroImageCandidates: urlCandidates,
    };
  });
}

/** 홈 첫 페인트용 — id·제목·분류·날짜·썸네일 URL만 (data URI 제외) */
export function mapPublishedListHeroMinimal(a) {
  const candidates = listHeroImageCandidates(a).filter((s) => s && !/^data:/i.test(String(s)));
  const url = candidates[0] || '';
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    published_at: a.published_at || '',
    thumb: url,
    imageUrl: url,
    heroImageCandidates: candidates.slice(0, 3),
  };
}

/** Public list/latest/home: no subtitle; sort timestamps + thumb only */
export function mapPublishedListRowForPublicFeed(a) {
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    summary: a.summary || '',
    created_at: a.created_at || '',
    published_at: a.published_at || '',
    submitted_at: a.submitted_at || '',
    updated_at: a.updated_at || '',
    status: toApiStatus(a.status),
    views: Number(a.views) || 0,
    thumb: publicThumbUrlOnly(a),
  };
}

export function mapPublishedListItem(a) {
  return {
    id: a.id,
    title: a.title || '',
    category: a.category || '',
    author_name: a.author_name || '',
    summary: a.summary || '',
    published_at: a.published_at || a.updated_at || a.created_at || '',
    views: Number(a.views) || 0,
    thumb: publicThumbUrlOnly(a),
  };
}

/** GET /api/home 번들: 최초 렌더용 최소 필드 (프론트 status 필터 호환) */
export function toHomeBundleLatestMin(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: x.id,
    title: x.title,
    category: x.category,
    author_name: x.author_name,
    summary: x.summary,
    published_at: x.published_at,
    status: x.status,
    // Use server canonical cardImage when available for consistent card rendering.
    thumb: stripDataUriThumbString(x.cardImage || x.thumb),
    imageUrl: stripDataUriThumbString(x.cardImage || x.primaryImage || x.imageUrl || x.image_url || x.thumb || ''),
    primaryImage: stripDataUriThumbString(x.cardImage || x.primaryImage || x.imageUrl || x.image_url || x.thumb || ''),
    cardImage: stripDataUriThumbString(x.cardImage || x.primaryImage || x.imageUrl || x.image_url || x.thumb || ''),
  }));
}

export function toHomeBundlePopularMin(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: x.id,
    title: x.title,
    category: x.category,
    author_name: x.author_name,
    published_at: x.published_at,
    views: Number(x.views) || 0,
    thumb: stripDataUriThumbString(x.cardImage || x.thumb),
    primaryImage: stripDataUriThumbString(x.cardImage || x.primaryImage || x.imageUrl || x.image_url || x.thumb || ''),
    cardImage: stripDataUriThumbString(x.cardImage || x.primaryImage || x.imageUrl || x.image_url || x.thumb || ''),
  }));
}

/** 홈 사이드 Weekly News: 제목만 (최근 7일·조회수 상위) */
export function mapHomeWeeklyNewsTitles(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((x) => ({
      id: Number(x && x.id),
      title: String((x && x.title) ?? '').slice(0, 2000),
    }))
    .filter((x) => Number.isFinite(x.id) && x.id > 0 && x.title.trim() !== '');
}

function plainTextSnippetFromRich(s, maxLen) {
  const t = String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** 홈 사이드 인물동정 카드 1건 */
export function toHomeBundlePersonSpotlight(row) {
  if (!row || row.id == null) return null;
  const title = String(row.title ?? '').trim();
  const summaryRaw = String(row.summary ?? '').trim();
  const snippet = summaryRaw
    ? plainTextSnippetFromRich(summaryRaw, 200)
    : plainTextSnippetFromRich(title, 120);
  return {
    id: Number(row.id),
    title: String(row.title ?? '').slice(0, 2000),
    snippet: String(snippet).slice(0, 400),
  };
}

/** Emergency home/public list: id, title, thumb, status, published_at only */
export function toUltraHomeLatest(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: x.id,
    title: x.title || '',
    thumb: stripDataUriThumbString(x.thumb),
    status: x.status || 'published',
    published_at: x.published_at || '',
  }));
}

export function toUltraHomePopular(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    id: x.id,
    title: x.title || '',
    thumb: stripDataUriThumbString(x.thumb),
  }));
}

export function toUltraPublicListRow(x) {
  if (!x || typeof x !== 'object') return x;
  return {
    id: x.id,
    title: x.title || '',
    thumb: stripDataUriThumbString(x.thumb),
    status: x.status || 'published',
    published_at: x.published_at || '',
  };
}

export function toUltraPublicListPayloadArr(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => toUltraPublicListRow(x));
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
    coverImageKey: r.cover_image_key ?? '',
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
