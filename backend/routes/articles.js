import { Router } from 'express';
import { articlesDb, toApiStatus } from '../db/articles.js';
import { authMiddleware } from '../middleware/auth.js';

export const articlesRouter = Router();

const debug = () => process.env.NW_DEBUG === '1';

// GET /api/articles/public/list — 메인 노출용 공개 기사 목록 (published 만, 최신순)
articlesRouter.get('/public/list', (req, res) => {
  const rows = articlesDb.listPublishedForMain();
  if (debug()) console.log('[articles] GET /public/list count=', rows.length, 'dbTotal=', articlesDb.count());
  res.json(rows);
});

// GET /api/articles/public/page — 전체기사 페이지 (페이지당 최대 20건, 최신순)
articlesRouter.get('/public/page', (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const data = articlesDb.listPublishedPaginated(page, limit);
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  if (debug()) console.log('[articles] GET /public/page', data.page, '/', data.totalPages, 'total', data.total);
  res.json(data);
});

// GET /api/articles/public/popular — 최근 N개월 게시분 조회수 순 (기본 3개월, 10건)
articlesRouter.get('/public/popular', (req, res) => {
  const months = Number(req.query.months) || 3;
  const limit = Number(req.query.limit) || 10;
  const rows = articlesDb.listPublishedPopularByMonths(months, limit);
  res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  if (debug()) console.log('[articles] GET /public/popular months=', months, 'count=', rows.length);
  res.json(rows);
});

// GET /api/articles/public/:id — 메인 기사 상세(게시 기사만)
articlesRouter.get('/public/:id', (req, res) => {
  const raw = articlesDb.rawRecord(req.params.id);
  if (!raw) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
  if (toApiStatus(raw.status) !== 'published') {
    return res.status(403).json({ error: '게시된 기사만 조회할 수 있습니다.' });
  }
  const row = articlesDb.incrementPublicViews(req.params.id);
  res.json(row || articlesDb.findById(req.params.id, null));
});

// GET /api/articles — 관리자/편집장: 전체 목록, 기자: 자신의 기사
articlesRouter.get('/', authMiddleware, (req, res) => {
  const role = req.user.role;
  if (role === 'reporter') {
    const rows = articlesDb.findByAuthor(req.user.id);
    if (debug())
      console.log('[articles] GET / reporter', { userId: req.user.id, count: rows.length, dbTotal: articlesDb.count() });
    return res.json(rows);
  }
  if (role !== 'admin' && role !== 'editor_in_chief') {
    return res.status(403).json({ error: '권한 없음' });
  }
  const rows = articlesDb.all();
  if (debug()) console.log('[articles] GET / staff', { userId: req.user.id, role, count: rows.length });
  res.json(rows);
});

// GET /api/articles/:id — 기자: 본인 기사 상세, 관리자/편집장: 기사 상세(검토용)
articlesRouter.get('/:id', authMiddleware, (req, res) => {
  const role = req.user.role;
  let row;
  if (role === 'reporter') {
    const ownerId = articlesDb.authorIdForArticle(req.params.id);
    if (ownerId == null) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    if (Number(ownerId) !== Number(req.user.id)) {
      return res.status(403).json({ error: '본인 기사만 조회할 수 있습니다.' });
    }
    row = articlesDb.findById(req.params.id, req.user.id);
  } else if (role === 'admin' || role === 'editor_in_chief') {
    row = articlesDb.findById(req.params.id, null);
  } else {
    return res.status(403).json({ error: '권한 없음' });
  }
  if (!row) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
  if (debug()) console.log('[articles] GET /:id ok', { id: row.id, status: row.status, role });
  res.json(row);
});

// POST /api/articles — 기자: 기사 작성
articlesRouter.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'reporter') {
    return res.status(403).json({ error: '기자만 기사를 작성할 수 있습니다.' });
  }
  const { title, subtitle, category, content, content1, content2, content3, image1, image2, image3, image1_caption, image2_caption, image3_caption, status } = req.body;
  const row = articlesDb.insert({
    title: title || '',
    subtitle: subtitle || '',
    category: category || '',
    content: content || '',
    content1: content1 || '', content2: content2 || '', content3: content3 || '',
    image1: image1 || '', image2: image2 || '', image3: image3 || '',
    image1_caption: image1_caption || '', image2_caption: image2_caption || '', image3_caption: image3_caption || '',
    status: status != null ? status : 'draft',
    authorId: req.user.id,
    authorName: req.user.name || '',
  });
  if (debug()) console.log('[articles] POST', { id: row.id, status: row.status, authorId: req.user.id });
  res.status(201).json(row);
});

// PATCH /api/articles/:id — 기자: 본인 기사 수정 (임시저장/작성완료/송고)
articlesRouter.patch('/:id', authMiddleware, (req, res) => {
  const role = req.user.role;
  if (role === 'reporter') {
    const { title, subtitle, category, content, content1, content2, content3, image1, image2, image3, image1_caption, image2_caption, image3_caption, status } = req.body;
    const ok = articlesDb.update(req.params.id, req.user.id, {
      title, subtitle, category, content, content1, content2, content3, image1, image2, image3, image1_caption, image2_caption, image3_caption, status,
    });
    if (!ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    const row = articlesDb.findById(req.params.id, req.user.id);
    if (debug()) console.log('[articles] PATCH reporter', { id: row?.id, status: row?.status });
    return res.json({ message: '수정되었습니다.', article: row });
  }
  if (role !== 'admin' && role !== 'editor_in_chief') {
    return res.status(403).json({ error: '권한 없음' });
  }
  const { id } = req.params;
  const { action, ...restBody } = req.body;
  if (action === 'approve') {
    if (!articlesDb.updateStatus(id, 'published')) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    const row = articlesDb.findById(id, null);
    if (debug()) console.log('[articles] approve', { id: row?.id });
    return res.json({ message: '승인되었습니다.', status: 'published', article: row });
  }
  if (action === 'reject') {
    if (!articlesDb.updateStatus(id, 'rejected')) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    const row = articlesDb.findById(id, null);
    if (debug()) console.log('[articles] reject', { id: row?.id });
    return res.json({ message: '반려되었습니다.', status: 'rejected', article: row });
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
    payload.image1 !== undefined ||
    payload.image2 !== undefined ||
    payload.image3 !== undefined ||
    payload.image1_caption !== undefined ||
    payload.image2_caption !== undefined ||
    payload.image3_caption !== undefined ||
    payload.summary !== undefined ||
    payload.status !== undefined;
  if (!hasMeta) {
    return res.status(400).json({ error: '수정할 필드가 없습니다. approve/reject 또는 본문 필드를 보내세요.' });
  }
  const ok = articlesDb.updateByStaff(id, payload);
  if (!ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
  const row = articlesDb.findById(id, null);
  return res.json({ message: '저장되었습니다.', article: row });
});
