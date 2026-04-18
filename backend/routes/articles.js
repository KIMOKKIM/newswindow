import { Router } from 'express';
import {
  articlesDb,
  authorIdNorm,
  isPublicFeedReadableStatus,
  toApiStatus,
  canonicalStoreStatus,
  normalizeTitleDedupeKey,
  dedupeWindowMs,
} from '../db/articles.js';
import {
  sanitizeForPublicListPayloadArr,
  sanitizeHeroPublicResponseArr,
  toUltraHomePopular,
  toUltraPublicListPayloadArr,
} from '../db/articles.shared.js';
import {
  emergencyCacheGet,
  emergencyCacheSet,
  emergencyMinPublicJson,
  emergencyShieldTtlMs,
} from '../lib/emergencyApiShield.js';
import { getArticlesReadSource, getArticlesWriteSource } from '../lib/dbMode.js';
import { authMiddleware } from '../middleware/auth.js';
import { invalidateArticleDerivedCaches } from '../lib/articleDerivedCache.js';
import { logPublicFeedAfterPublish } from '../lib/feedConsistencyLog.js';
import { tracePublicFeedPresence } from '../lib/publicFeedTrace.js';
import { getPopularSinceCached } from '../lib/popularMemCache.js';
import {
  classifyUpstreamError,
  fallbackPublicLatest,
  isPublicReadSoftFailEnabled,
  logPublicSoftfail,
  NW_DEGRADED_REASON_HEADER,
  recordPublicLatestSuccess,
  runWithReadDeadline,
  upstreamPrimaryCategory,
} from '../lib/publicReadSoftFail.js';

export const articlesRouter = Router();

/** 스태프 대시보드·메인 공개 API 모두 동일 articlesDb — 헤더로 저장소 표시 */
articlesRouter.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('X-NW-Articles-Source', getArticlesReadSource());
  next();
});

articlesRouter.use((req, res, next) => {
  if (String(process.env.NW_HTTP_LOG_ARTICLES_JSON || '').trim() === '1') {
    const _json = res.json.bind(res);
    res.json = (body) => {
      console.log(
        '[nw/articles/json]',
        JSON.stringify({
          reqId: req.nwRequestId,
          method: req.method,
          path: req.originalUrl || req.url,
          articlesReadSource: getArticlesReadSource(),
        }),
      );
      return _json(body);
    };
  }
  next();
});

const debug = () => process.env.NW_DEBUG === '1';
const saveTiming = () => String(process.env.NW_SAVE_TIMING_LOG || '').trim() === '1';

/** 동일 기자·짧은 시간·동일(정규화) 제목 송고/게시 중복 차단 */
async function assertNoRecentDupSubmit(articlesDbClient, { authorId, title, excludeId }) {
  const key = normalizeTitleDedupeKey(title);
  if (!key) return;
  const dup = await articlesDbClient.findRecentDuplicateForAuthorSubmission(
    authorId,
    key,
    excludeId,
    dedupeWindowMs(),
  );
  if (dup) {
    const e = new Error(
      '같은 제목의 기사가 방금 송고 또는 게시되었습니다. 잠시 후 다시 시도하세요.',
    );
    e.statusCode = 409;
    e.existingId = dup.id;
    throw e;
  }
}

function isDupConflict(e) {
  return e && Number(e.statusCode) === 409;
}

// GET /api/articles/public/list — 메인 노출용 공개 기사 목록 (승인·게시 published 만, 최신순)
articlesRouter.get('/public/list', async (req, res, next) => {
  const t0 = Date.now();
  const shieldKey = 'GET /api/articles/public/list';
  try {
    const cachedList = emergencyCacheGet(shieldKey);
    if (cachedList != null) {
      res.set('X-NW-Emergency-Cache', 'HIT');
      res.set('X-NW-Emergency-Shield-Ttl-Ms', String(emergencyShieldTtlMs()));
      return res.json(cachedList);
    }
    /** listPublishedForMain 내부에서만 피드 조회 — 통합 피드 이중 로드 제거 */
    const rows = await articlesDb.listPublishedForMain();
    tracePublicFeedPresence(
      'api/articles/public/list',
      rows.map((r) => ({ id: r.id, title: r.title })),
      { len: rows.length },
    );
    if (debug()) console.log('[articles] GET /public/list count=', rows.length);
    if (String(process.env.NW_PUBLIC_FEED_DEBUG || '').trim() === '1') {
      console.log(
        '[nw/public-list]',
        JSON.stringify({ ids: (rows || []).slice(0, 50).map((r) => r && r.id) }),
      );
    }
    let out = emergencyMinPublicJson()
      ? toUltraPublicListPayloadArr(sanitizeForPublicListPayloadArr(rows))
      : sanitizeForPublicListPayloadArr(rows);
    // Post-process: ensure a canonical primary image (and cardImage) is present when possible.
    try {
      for (let i = 0; i < (rows || []).length; i++) {
        const original = rows[i] || {};
        const itemOut = out[i] || {};
        // If no public primary image keys are present, try deriving from hero candidates.
        if (!itemOut.primaryImage && !itemOut.thumb && !itemOut.imageUrl && !itemOut.image_url) {
          try {
            const cand = require('../db/articles.shared.js').publicThumbUrlOnly(original);
            if (cand) {
              const v = String(cand || '').trim();
              if (v) {
                itemOut.thumb = v;
                itemOut.imageUrl = v;
                itemOut.image_url = v;
                itemOut.primaryImage = v;
                out[i] = itemOut;
              }
            }
          } catch (_e) {
            /* best-effort */
          }
        }
        // Ensure cardImage exists using resolveCardImage (server-side canonical).
        try {
          if (!itemOut.cardImage) {
            try {
              // Debug: log raw input before resolveCardImage
              try {
                console.info(
                  '[nw/card-image-debug]',
                  JSON.stringify({
                    id: original && original.id,
                    coverImageKey: original && (original.coverImageKey || original.cover_image_key || ''),
                    image1: original && (original.image1 || original.image_1 || ''),
                    image2: original && (original.image2 || original.image_2 || ''),
                    image3: original && (original.image3 || original.image_3 || ''),
                    image4: original && (original.image4 || original.image_4 || ''),
                    primaryImage: original && (original.primaryImage || original.primary_image || ''),
                    thumb: original && (original.thumb || ''),
                    imageUrl: original && (original.imageUrl || original.image_url || ''),
                    cardImage: itemOut.cardImage || '',
                  }),
                );
              } catch (_e0) {}
              const resolved = require('../db/articles.shared.js').resolveCardImage(original);
              if (resolved) {
                itemOut.cardImage = resolved;
                // also ensure primary/thumb mirror if missing
                if (!itemOut.primaryImage) itemOut.primaryImage = resolved;
                if (!itemOut.thumb) itemOut.thumb = resolved;
                if (!itemOut.imageUrl) itemOut.imageUrl = resolved;
                if (!itemOut.image_url) itemOut.image_url = resolved;
                out[i] = itemOut;
              }
            } catch (_e1) {}
          }
        } catch (_e2) {}
      }
    } catch (_e) {
      /* best-effort */
    }
    // Log top 5 cardImage resolution results for quick debugging.
    try {
      const dbg = (out || []).slice(0, 5).map((it) => ({
        id: it && it.id,
        coverImageKey: it && (it.coverImageKey || it.cover_image_key),
        cardImage: it && it.cardImage,
      }));
      console.info('[nw/card-image]', JSON.stringify({ route: 'GET /api/articles/public/list', reqId: req.nwRequestId, sample: dbg }));
    } catch (_e) {}
    emergencyCacheSet(shieldKey, out);
    console.info(
      '[nw/public-list]',
      JSON.stringify({
        route: 'GET /api/articles/public/list',
        reqId: req.nwRequestId,
        count: out.length,
        ms: Date.now() - t0,
      }),
    );
    res.json(out);
  } catch (e) {
    console.warn('[nw/public-list] emergency empty', e && e.message);
    res.status(200).json([]);
  }
});

// Static /public/* routes must be registered before /public/:id (otherwise "latest" is parsed as id).

// GET /api/articles/public/latest — 메인 상단용 (?hero=1 이면 첫 페인트용 초소형 JSON, limit 기본 5)
// Main page: 4s client timeout; check X-NW-Public-Latest-Timing-Ms and slow logs when diagnosing.
articlesRouter.get('/public/latest', async (req, res, next) => {
  try {
    const hq = req.query.hero;
    const hero =
      hq === '1' ||
      hq === 1 ||
      hq === true ||
      (Array.isArray(hq) && hq.some((x) => String(x).trim() === '1')) ||
      String(hq || '').trim() === '1';
       const limit = hero
      ? Math.min(15, Math.max(1, Number(req.query.limit) || 5))
      : Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const shieldKey = `GET /api/articles/public/latest?hero=${hero ? 1 : 0}&limit=${limit}`;
    const cachedL = emergencyCacheGet(shieldKey);
    if (cachedL != null) {
      res.set('X-NW-Emergency-Cache', 'HIT');
      res.set('X-NW-Emergency-Shield-Ttl-Ms', String(emergencyShieldTtlMs()));
      res.set('X-NW-Public-Latest-Hero', hero ? '1' : '0');
      return res.json(cachedL);
    }
    const t0 = Date.now();
    let rows;
    let degraded = false;
    try {
      rows = hero
        ? await runWithReadDeadline(() => articlesDb.listPublishedLatestHero(limit))
        : await runWithReadDeadline(() => articlesDb.listPublishedLatest(limit));
    } catch (err) {
      if (!isPublicReadSoftFailEnabled()) throw err;
      rows = fallbackPublicLatest(limit, hero);
      degraded = true;
      const fallbackSource = rows.length ? 'last_success_cache' : 'empty';
      logPublicSoftfail('GET /api/articles/public/latest', err, {
        hero,
        limit,
        reqId: req.nwRequestId,
        ms: Date.now() - t0,
        fallbackSource,
      });
    }
    const serverMs = Date.now() - t0;
    let payload = hero ? sanitizeHeroPublicResponseArr(rows) : sanitizeForPublicListPayloadArr(rows);
    if (emergencyMinPublicJson()) {
      payload = hero
        ? payload.map((r) => ({
            id: r.id,
            title: r.title || '',
            thumb: String(r.thumb || r.imageUrl || '').trim(),
          }))
        : toUltraPublicListPayloadArr(payload);
    }
    if (!degraded) recordPublicLatestSuccess(payload);
    const jsonBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    res.set('X-NW-Public-Latest-Hero', hero ? '1' : '0');
    res.set('X-NW-Public-Main-Slim', '1');
    if (degraded) {
      res.set('X-NW-Degraded', '1');
      res.set('X-NW-Degraded-Reason', NW_DEGRADED_REASON_HEADER);
      res.set('X-NW-Soft-Fail', 'public-latest');
    }
    res.set('X-NW-Public-Latest-Timing-Ms', String(serverMs));
    res.set('X-NW-Public-Latest-Json-Bytes', String(jsonBytes));
    res.set(
      'Access-Control-Expose-Headers',
      'X-NW-Public-Latest-Hero, X-NW-Public-Latest-Timing-Ms, X-NW-Public-Latest-Json-Bytes, X-NW-Public-Main-Slim, X-NW-Degraded, X-NW-Degraded-Reason, X-NW-Soft-Fail',
    );
    res.set(
      'Cache-Control',
      hero
        ? 'public, s-maxage=60, stale-while-revalidate=120'
        : 'public, s-maxage=30, stale-while-revalidate=90',
    );
    if (debug()) console.log('[articles] GET /public/latest hero=', hero, 'limit=', limit, 'count=', rows.length, 'ms=', serverMs, 'bytes=', jsonBytes);
    if (serverMs > 4000) {
      console.warn(
        '[articles] slow GET /public/latest',
        JSON.stringify({ hero, limit, serverMs, count: rows.length, bytes: jsonBytes }),
      );
    }
    console.info(
      '[nw/home-feed]',
      JSON.stringify({
        route: 'GET /api/articles/public/latest',
        reqId: req.nwRequestId,
        hero: !!hero,
        count: payload.length,
        degraded,
        ms: serverMs,
      }),
    );
    emergencyCacheSet(shieldKey, payload);
    res.json(payload);
  } catch (e) {
    console.warn('[nw/public-latest] emergency empty', e && e.message);
    res.status(200).json([]);
  }
});


// GET /api/articles/public/page — 전체기사·섹션 (최신순, ?q= 제목, ?category= 섹션·하위분류)
articlesRouter.get('/public/page', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const q = req.query.q != null ? String(req.query.q) : '';
    const category = req.query.category != null ? String(req.query.category) : '';
    const authorName = req.query.author != null ? String(req.query.author) : '';
    const excludeId = req.query.exclude_id != null ? String(req.query.exclude_id) : '';
    const opts = {};
    if (authorName.trim()) opts.authorName = authorName;
    if (excludeId.trim()) opts.excludeId = excludeId;
    const data = await articlesDb.listPublishedPaginated(page, limit, q, category, opts);
    if (debug()) console.log('[articles] GET /public/page', data.page, '/', data.totalPages, 'total', data.total);
    res.json({
      ...data,
      items: sanitizeForPublicListPayloadArr(data.items || []),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/articles/public/popular — 조회수 순 (?category= 섹션 시 해당 분류만)


articlesRouter.get('/public/sitemap-entries', async (req, res, next) => {
  try {
    const articles = await articlesDb.listPublishedSitemapRows();
    res.json({ siteUrl: 'https://www.newswindow.kr', articles });
  } catch (e) {
    next(e);
  }
});
articlesRouter.get('/public/popular', async (req, res, next) => {
  const t0Popular = Date.now();
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const category = req.query.category != null ? String(req.query.category) : '';
    const daysQ = req.query.days;
    const hasDays = daysQ != null && String(daysQ).trim() !== '';
    const months = hasDays ? 0 : Number(req.query.months) || 3;
    const days = hasDays ? Math.max(1, Math.min(366, Number(daysQ) || 30)) : 0;
    const popShieldKey = `GET /api/articles/public/popular?lim=${limit}&cat=${encodeURIComponent(category)}&d=${hasDays ? `day${days}` : `mo${months}`}`;
    const cachedPop = emergencyCacheGet(popShieldKey);
    if (cachedPop != null) {
      res.set('X-NW-Emergency-Cache', 'HIT');
      res.set('X-NW-Emergency-Shield-Ttl-Ms', String(emergencyShieldTtlMs()));
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      return res.json(cachedPop);
    }
    let sinceMs;
    if (hasDays) {
      sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
      if (debug()) console.log('[articles] GET /public/popular days=', days);
    } else {
      sinceMs = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
      if (debug()) console.log('[articles] GET /public/popular months=', months);
    }
    const pr = await getPopularSinceCached(sinceMs, limit, category);
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    res.set('X-NW-Popular-Cache', pr.cacheHit ? 'HIT' : 'MISS');
    res.set('X-NW-Popular-Db-Ms', String(pr.dbMs));
    if (debug()) console.log('[articles] GET /public/popular count=', pr.rows.length, 'cache=', pr.cacheHit);
    const popSan = sanitizeForPublicListPayloadArr(pr.rows);
    const popOut = emergencyMinPublicJson() ? toUltraHomePopular(popSan) : popSan;
    emergencyCacheSet(popShieldKey, popOut);
    console.info(
      '[nw/most-viewed]',
      JSON.stringify({
        route: 'GET /api/articles/public/popular',
        reqId: req.nwRequestId,
        count: popOut.length,
        cacheHit: !!pr.cacheHit,
        dbMs: pr.dbMs,
        ms: Date.now() - t0Popular,
        degraded: false,
      }),
    );
    res.json(popOut);
  } catch (e) {
    logPublicSoftfail('GET /api/articles/public/popular', e, {
      reqId: req.nwRequestId,
      ms: Date.now() - t0Popular,
      status: 200,
      fallbackSource: 'empty-array',
    });
    res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    res.set('X-NW-Degraded', '1');
    res.set('X-NW-Degraded-Reason', NW_DEGRADED_REASON_HEADER);
    res.set('X-NW-Soft-Fail', 'popular');
    res.set('X-NW-Popular-Cache', 'MISS');
    res.set('X-NW-Popular-Db-Ms', '0');
    res.status(200).json([]);
  }
});

// GET /api/articles/public/:id — 공개 기사 상세 (published 만; 조회수 증가는 published)
articlesRouter.get('/public/:id(\\d+)', async (req, res, next) => {
  const t0 = Date.now();
  try {
    const raw = await articlesDb.rawRecord(req.params.id);
    if (!raw) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    if (!isPublicFeedReadableStatus(raw.status)) {
      return res.status(403).json({ error: '공개된 기사만 조회할 수 있습니다.' });
    }
    const st = toApiStatus(raw.status);
    let row =
      st === 'published'
        ? await articlesDb.incrementPublicViews(req.params.id)
        : await articlesDb.findById(req.params.id, null);
    if (!row) row = await articlesDb.findById(req.params.id, null);
    if (!row) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    res.json(row);
  } catch (e) {
    const ms = Date.now() - t0;
    const tags = classifyUpstreamError(e);
    const upstreamCategory = upstreamPrimaryCategory(tags);
    console.error(
      '[nw/article-detail]',
      JSON.stringify({
        route: 'GET /api/articles/public/:id',
        reqId: req.nwRequestId,
        articleId: req.params.id,
        ms,
        upstreamCategory,
        tags,
      }),
    );
    next(e);
  }
});

// GET /api/articles — 관리자/편집장: 전체 목록, 기자: 자신의 기사
articlesRouter.get('/', authMiddleware, async (req, res, next) => {
  const t0Dash = Date.now();
  try {
    const role = req.user.role;
    if (role === 'reporter') {
      const rows = await articlesDb.findByAuthor(req.user.id, req.user.name);
      if (debug()) console.log('[articles] GET / reporter', { userId: req.user.id, count: rows.length });
      console.info(
        '[nw/dashboard-list]',
        JSON.stringify({
          route: 'GET /api/articles',
          reqId: req.nwRequestId,
          role: 'reporter',
          count: rows.length,
          ms: Date.now() - t0Dash,
        }),
      );
      return res.json(rows);
    }
    if (role !== 'admin' && role !== 'editor_in_chief') {
      return res.status(403).json({ error: '권한 없음' });
    }
    const rows = await articlesDb.all();
    if (debug()) console.log('[articles] GET / staff', { userId: req.user.id, role, count: rows.length });
    console.info(
      '[nw/dashboard-list]',
      JSON.stringify({
        route: 'GET /api/articles',
        reqId: req.nwRequestId,
        role,
        count: rows.length,
        ms: Date.now() - t0Dash,
      }),
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/articles/:id — 기자: 본인 기사 상세, 관리자/편집장: 기사 상세(검토용)
articlesRouter.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const role = req.user.role;
    let row;
    if (role === 'reporter') {
      const raw = await articlesDb.rawRecord(req.params.id);
      if (!raw) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
      const ownerNorm = authorIdNorm(raw.author_id);
      const uid = authorIdNorm(req.user.id);
      if (ownerNorm != null && ownerNorm !== uid) {
        return res.status(403).json({ error: '본인 기사만 조회할 수 있습니다.' });
      }
      row = await articlesDb.findById(req.params.id, req.user.id, req.user.name);
      if (!row) return res.status(403).json({ error: '본인 기사만 조회할 수 있습니다.' });
    } else if (role === 'admin' || role === 'editor_in_chief') {
      row = await articlesDb.findById(req.params.id, null);
    } else {
      return res.status(403).json({ error: '권한 없음' });
    }
    if (!row) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    if (debug()) console.log('[articles] GET /:id ok', { id: row.id, status: row.status, role });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// POST /api/articles — 기자: 기사 작성
articlesRouter.post('/', authMiddleware, async (req, res, next) => {
  const tSave = Date.now();
  try {
    // Allow reporters and admins to create articles.
    if (req.user.role !== 'reporter' && req.user.role !== 'admin') {
      return res.status(403).json({ error: '기자 또는 관리자만 기사를 작성할 수 있습니다.' });
    }
    const { title, subtitle, category, content, content1, content2, content3, content4, image1, image2, image3, image4, image1_caption, image2_caption, image3_caption, image4_caption, status, coverImageKey } =
      req.body;
    try {
      console.error(
        '[nw/article-save-body]',
        JSON.stringify({
          route: req.originalUrl || req.url,
          reqId: req.nwRequestId,
          keys: Object.keys(req.body || {}),
          lens: {
            image1: String(req.body.image1 || '').length,
            image2: String(req.body.image2 || '').length,
            image3: String(req.body.image3 || '').length,
            image4: String(req.body.image4 || '').length,
          },
          coverImageKey: String(req.body.coverImageKey || req.body.cover_image_key || '').slice(0, 200),
        }),
      );
    } catch (_) {}
    const st = canonicalStoreStatus(status != null ? status : 'draft');
    if (st === 'submitted') {
      try {
        await assertNoRecentDupSubmit(articlesDb, {
          authorId: req.user.id,
          title: title || '',
          excludeId: null,
        });
      } catch (e) {
        if (isDupConflict(e)) {
          return res.status(409).json({ error: e.message, existingId: e.existingId });
        }
        throw e;
      }
    }
    const row = await articlesDb.insert({
      title: title || '',
      subtitle: subtitle || '',
      category: category || '',
      content: content || '',
      content1: content1 || '',
      content2: content2 || '',
      content3: content3 || '',
      content4: content4 || '',
      image1: image1 || '',
      image2: image2 || '',
      image3: image3 || '',
      image4: image4 || '',
      image1_caption: image1_caption || '',
      image2_caption: image2_caption || '',
      image3_caption: image3_caption || '',
      image4_caption: image4_caption || '',
      coverImageKey: coverImageKey || '',
      status: status != null ? status : 'draft',
      authorId: req.user.id,
      authorName: req.user.name || '',
    });
    if (debug()) console.log('[articles] POST', { id: row.id, status: row.status, authorId: req.user.id });
    await invalidateArticleDerivedCaches({
      reason: 'POST /api/articles',
      reqId: req.nwRequestId,
      articleId: row.id,
      status: row.status,
      role: 'reporter',
    });
    console.info(
      '[nw/article-save]',
      JSON.stringify({
        route: 'POST /api/articles',
        reqId: req.nwRequestId,
        articleId: row.id,
        status: row.status,
        count: null,
        ms: Date.now() - tSave,
        role: 'reporter',
      }),
    );
    res.status(201).json(row);
  } catch (e) {
    if (isDupConflict(e)) {
      return res.status(409).json({ error: e.message, existingId: e.existingId });
    }
    next(e);
  }
});

// PATCH /api/articles/:id — 기자: 본인 기사 수정 (임시저장/작성완료/송고)
articlesRouter.patch('/:id', authMiddleware, async (req, res, next) => {
  const t0 = Date.now();
  try {
    const role = req.user.role;
    if (role === 'reporter') {
      const { title, subtitle, category, content, content1, content2, content3, content4, image1, image2, image3, image4, image1_caption, image2_caption, image3_caption, image4_caption, status, coverImageKey } =
        req.body;
      try {
        console.error(
          '[nw/article-save-body]',
          JSON.stringify({
            route: req.originalUrl || req.url,
            reqId: req.nwRequestId,
            keys: Object.keys(req.body || {}),
            lens: {
              image1: String(req.body.image1 || '').length,
              image2: String(req.body.image2 || '').length,
              image3: String(req.body.image3 || '').length,
              image4: String(req.body.image4 || '').length,
            },
            coverImageKey: String(req.body.coverImageKey || req.body.cover_image_key || '').slice(0, 200),
          }),
        );
      } catch (_) {}
      const tAfterBody = Date.now();
      const raw = await articlesDb.recordLightForPatch(req.params.id);
      if (!raw) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
      const prevCanon = canonicalStoreStatus(raw.status);
      const nextCanon = status !== undefined ? canonicalStoreStatus(status) : prevCanon;
      if (nextCanon === 'submitted' && prevCanon !== 'submitted') {
        const titleForDup = title !== undefined ? title : raw.title;
        try {
          await assertNoRecentDupSubmit(articlesDb, {
            authorId: req.user.id,
            title: titleForDup || '',
            excludeId: req.params.id,
          });
        } catch (e) {
          if (isDupConflict(e)) {
            return res.status(409).json({ error: e.message, existingId: e.existingId });
          }
          throw e;
        }
      }
      const tAfterDup = Date.now();
      const upd = await articlesDb.update(
        req.params.id,
        req.user.id,
        {
          title,
          subtitle,
          category,
          content,
          content1,
          content2,
          content3,
          content4,
          image1,
          image2,
          image3,
          image4,
          image1_caption,
          image2_caption,
          image3_caption,
          image4_caption,
          coverImageKey,
          status,
        },
        req.user.name
      );
      const tAfterDb = Date.now();
      if (!upd.ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
      await invalidateArticleDerivedCaches({
        reason: 'PATCH /api/articles/:id reporter',
        reqId: req.nwRequestId,
        articleId: upd.article?.id,
        status: upd.article?.status,
        role: 'reporter',
      });
      if (toApiStatus(upd.article && upd.article.status) === 'published') {
        await logPublicFeedAfterPublish('reporter-patch', upd.article?.id, upd.article?.title);
      }
      console.info(
        '[nw/article-save]',
        JSON.stringify({
          route: 'PATCH /api/articles/:id',
          reqId: req.nwRequestId,
          articleId: upd.article?.id,
          status: upd.article?.status,
          count: null,
          ms: Date.now() - t0,
          role: 'reporter',
        }),
      );
      if (debug()) console.log('[articles] PATCH reporter', { id: upd.article?.id, status: upd.article?.status });
      if (saveTiming()) {
        console.log(
          '[nw/articles/save]',
          JSON.stringify({
            role: 'reporter',
            id: req.params.id,
            validateMs: tAfterBody - t0,
            dupAndLoadMs: tAfterDup - tAfterBody,
            dbMs: tAfterDb - tAfterDup,
            totalMs: Date.now() - t0,
            responseBytes: Buffer.byteLength(JSON.stringify({ message: '수정되었습니다.', article: upd.article }), 'utf8'),
          }),
        );
      }
      return res.json({ message: '수정되었습니다.', article: upd.article });
    }
    if (role !== 'admin' && role !== 'editor_in_chief') {
      return res.status(403).json({ error: '권한 없음' });
    }
    const { id } = req.params;
      const { action, ...restBody } = req.body;
    if (action === 'approve') {
      const r = await articlesDb.approveFromSubmitted(id);
      if (!r.ok) return res.status(r.http).json({ error: r.error });
      await invalidateArticleDerivedCaches({
        reason: 'approve',
        reqId: req.nwRequestId,
        articleId: r.article?.id,
        status: 'published',
        role: req.user.role,
      });
      await logPublicFeedAfterPublish('approve', r.article?.id, r.article?.title);
      console.info(
        '[nw/article-save]',
        JSON.stringify({
          route: 'PATCH /api/articles/:id approve',
          reqId: req.nwRequestId,
          articleId: r.article?.id,
          status: 'published',
          count: null,
          ms: Date.now() - t0,
          role: String(req.user.role),
        }),
      );
      if (debug()) console.log('[articles] approve', { id: r.article?.id, idempotent: r.idempotent });
      return res.json({
        message: r.idempotent ? '이미 게시된 기사입니다.' : '승인되었습니다.',
        status: 'published',
        article: r.article,
        idempotent: !!r.idempotent,
      });
    }
    if (action === 'reject') {
      const r = await articlesDb.rejectFromSubmitted(id);
      if (!r.ok) return res.status(r.http).json({ error: r.error });
      await invalidateArticleDerivedCaches({
        reason: 'reject',
        reqId: req.nwRequestId,
        articleId: r.article?.id,
        status: 'rejected',
        role: req.user.role,
      });
      if (debug()) console.log('[articles] reject', { id: r.article?.id, idempotent: r.idempotent });
      return res.json({
        message: r.idempotent ? '이미 반려된 기사입니다.' : '반려되었습니다.',
        status: 'rejected',
        article: r.article,
        idempotent: !!r.idempotent,
      });
    }
    const payload = { ...restBody };
    delete payload.action;
    const hasMeta =
      payload.title !== undefined ||
      payload.subtitle !== undefined ||
      payload.category !== undefined ||
      payload.content !== undefined ||
      payload.content1 !== undefined ||
      payload.content2 !== undefined ||
      payload.content3 !== undefined ||
      payload.content4 !== undefined ||
      payload.image1 !== undefined ||
      payload.image2 !== undefined ||
      payload.image3 !== undefined ||
      payload.image4 !== undefined ||
      payload.image1_caption !== undefined ||
      payload.image2_caption !== undefined ||
      payload.image3_caption !== undefined ||
      payload.image4_caption !== undefined ||
      payload.summary !== undefined ||
      payload.status !== undefined;
    if (!hasMeta) {
      return res.status(400).json({ error: '수정할 필드가 없습니다. approve/reject 또는 본문 필드를 보내세요.' });
    }
    const tStaffPayload = Date.now();
    const staffUpd = await articlesDb.updateByStaff(id, payload);
    const tStaffDb = Date.now();
    if (!staffUpd.ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    await invalidateArticleDerivedCaches({
      reason: 'PATCH /api/articles/:id staff',
      reqId: req.nwRequestId,
      articleId: staffUpd.article?.id,
      status: staffUpd.article?.status,
      role: req.user.role,
    });
    if (toApiStatus(staffUpd.article && staffUpd.article.status) === 'published') {
      await logPublicFeedAfterPublish('staff-patch', staffUpd.article?.id, staffUpd.article?.title);
    }
    console.info(
      '[nw/article-save]',
      JSON.stringify({
        route: 'PATCH /api/articles/:id',
        reqId: req.nwRequestId,
        articleId: staffUpd.article?.id,
        status: staffUpd.article?.status,
        count: null,
        ms: Date.now() - t0,
        role: String(req.user.role),
      }),
    );
    if (saveTiming()) {
      const bodyOut = { message: '저장되었습니다.', article: staffUpd.article };
      console.log(
        '[nw/articles/save]',
        JSON.stringify({
          role: 'staff',
          id,
          validateMs: tStaffPayload - t0,
          dbMs: tStaffDb - tStaffPayload,
          totalMs: Date.now() - t0,
          responseBytes: Buffer.byteLength(JSON.stringify(bodyOut), 'utf8'),
        }),
      );
    }
    return res.json({ message: '저장되었습니다.', article: staffUpd.article });
  } catch (e) {
    if (isDupConflict(e)) {
      return res.status(409).json({ error: e.message, existingId: e.existingId });
    }
    next(e);
  }
});
