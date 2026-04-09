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
import { getArticlesReadSource, getArticlesWriteSource } from '../lib/dbMode.js';
import { authMiddleware } from '../middleware/auth.js';

export const articlesRouter = Router();

/** 스태프 대시보드·메인 공개 API 모두 동일 articlesDb — 헤더로 저장소 표시 */
articlesRouter.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  res.set('X-NW-Articles-Source', getArticlesReadSource());
  next();
});

articlesRouter.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    console.log(
      '[nw/articles]',
      JSON.stringify({
        method: req.method,
        path: req.originalUrl || req.url,
        op: req.method === 'GET' ? 'read' : 'write',
        articlesReadSource: getArticlesReadSource(),
        articlesWriteSource: getArticlesWriteSource(),
      }),
    );
    return _json(body);
  };
  next();
});

const debug = () => process.env.NW_DEBUG === '1';

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
  try {
    const rows = await articlesDb.listPublishedForMain();
    if (debug()) console.log('[articles] GET /public/list count=', rows.length);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/articles/public/page — 전체기사 페이지 (페이지당 최대 20건, 최신순)
articlesRouter.get('/public/page', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await articlesDb.listPublishedPaginated(page, limit);
    if (debug()) console.log('[articles] GET /public/page', data.page, '/', data.totalPages, 'total', data.total);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// GET /api/articles/public/popular — 조회수 순 (days=30: 최근 30일, months: 생략 시 기본 3개월·전체기사 페이지용)
articlesRouter.get('/public/popular', async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const daysQ = req.query.days;
    const hasDays = daysQ != null && String(daysQ).trim() !== '';
    let rows;
    if (hasDays) {
      const days = Math.max(1, Math.min(366, Number(daysQ) || 30));
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
      rows = await articlesDb.listPublishedPopularSince(sinceMs, limit);
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      if (debug()) console.log('[articles] GET /public/popular days=', days, 'count=', rows.length);
    } else {
      const months = Number(req.query.months) || 3;
      rows = await articlesDb.listPublishedPopularByMonths(months, limit);
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      if (debug()) console.log('[articles] GET /public/popular months=', months, 'count=', rows.length);
    }
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/articles/public/:id — 공개 기사 상세 (published 만; 조회수 증가는 published)
articlesRouter.get('/public/:id', async (req, res, next) => {
  try {
    const raw = await articlesDb.rawRecord(req.params.id);
    if (!raw) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    if (!isPublicFeedReadableStatus(raw.status)) {
      return res.status(403).json({ error: '공개된 기사만 조회할 수 있습니다.' });
    }
    const st = toApiStatus(raw.status);
    const row =
      st === 'published'
        ? await articlesDb.incrementPublicViews(req.params.id)
        : await articlesDb.findById(req.params.id, null);
    res.json(row || (await articlesDb.findById(req.params.id, null)));
  } catch (e) {
    next(e);
  }
});

// GET /api/articles — 관리자/편집장: 전체 목록, 기자: 자신의 기사
articlesRouter.get('/', authMiddleware, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role === 'reporter') {
      const rows = await articlesDb.findByAuthor(req.user.id, req.user.name);
      if (debug()) console.log('[articles] GET / reporter', { userId: req.user.id, count: rows.length });
      return res.json(rows);
    }
    if (role !== 'admin' && role !== 'editor_in_chief') {
      return res.status(403).json({ error: '권한 없음' });
    }
    const rows = await articlesDb.all();
    if (debug()) console.log('[articles] GET / staff', { userId: req.user.id, role, count: rows.length });
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
  try {
    if (req.user.role !== 'reporter') {
      return res.status(403).json({ error: '기자만 기사를 작성할 수 있습니다.' });
    }
    const { title, subtitle, category, content, content1, content2, content3, content4, image1, image2, image3, image4, image1_caption, image2_caption, image3_caption, image4_caption, status } =
      req.body;
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
      status: status != null ? status : 'draft',
      authorId: req.user.id,
      authorName: req.user.name || '',
    });
    if (debug()) console.log('[articles] POST', { id: row.id, status: row.status, authorId: req.user.id });
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
  try {
    const role = req.user.role;
    if (role === 'reporter') {
      const { title, subtitle, category, content, content1, content2, content3, content4, image1, image2, image3, image4, image1_caption, image2_caption, image3_caption, image4_caption, status } =
        req.body;
      const raw = await articlesDb.rawRecord(req.params.id);
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
      const ok = await articlesDb.update(
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
          status,
        },
        req.user.name
      );
      if (!ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
      const row = await articlesDb.findById(req.params.id, req.user.id, req.user.name);
      if (debug()) console.log('[articles] PATCH reporter', { id: row?.id, status: row?.status });
      return res.json({ message: '수정되었습니다.', article: row });
    }
    if (role !== 'admin' && role !== 'editor_in_chief') {
      return res.status(403).json({ error: '권한 없음' });
    }
    const { id } = req.params;
    const { action, ...restBody } = req.body;
    if (action === 'approve') {
      const r = await articlesDb.approveFromSubmitted(id);
      if (!r.ok) return res.status(r.http).json({ error: r.error });
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
    const ok = await articlesDb.updateByStaff(id, payload);
    if (!ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    const row = await articlesDb.findById(id, null);
    return res.json({ message: '저장되었습니다.', article: row });
  } catch (e) {
    if (isDupConflict(e)) {
      return res.status(409).json({ error: e.message, existingId: e.existingId });
    }
    next(e);
  }
});
