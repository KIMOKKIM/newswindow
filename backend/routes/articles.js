import { Router } from 'express';
import crypto from 'crypto';
import { articlesDb } from '../db/articles.js';

export const articlesRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증 필요' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: '토큰 만료 또는 유효하지 않음' });
  req.user = user;
  next();
}

// GET /api/articles/public/list — 메인 노출용 공개 기사 목록(published, 썸네일 포함)
articlesRouter.get('/public/list', (req, res) => {
  res.json(articlesDb.publishedPublicList());
});

// GET /api/articles/public/:id — 메인 기사 상세(게시 기사만)
articlesRouter.get('/public/:id', (req, res) => {
  const row = articlesDb.findById(req.params.id, null);
  if (!row) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
  if ((row.status || '').toLowerCase() !== 'published') {
    return res.status(403).json({ error: '게시된 기사만 조회할 수 있습니다.' });
  }
  res.json(row);
});

// GET /api/articles — 관리자/편집장: 전체 목록, 기자: 자신의 기사
articlesRouter.get('/', authMiddleware, (req, res) => {
  const role = (req.user?.role || '').trim().toLowerCase();
  if (role === 'reporter') {
    const rows = articlesDb.findByAuthor(req.user.id);
    return res.json(rows);
  }
  if (role !== 'admin' && role !== 'editor_in_chief') {
    return res.status(403).json({ error: '권한 없음' });
  }
  const rows = articlesDb.all();
  res.json(rows);
});

// GET /api/articles/:id — 기자: 본인 기사 상세, 관리자/편집장: 기사 상세(검토용)
articlesRouter.get('/:id', authMiddleware, (req, res) => {
  const role = (req.user?.role || '').trim().toLowerCase();
  let row;
  if (role === 'reporter') {
    row = articlesDb.findById(req.params.id, req.user.id);
  } else if (role === 'admin' || role === 'editor_in_chief') {
    row = articlesDb.findById(req.params.id, null);
  } else {
    return res.status(403).json({ error: '권한 없음' });
  }
  if (!row) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
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
    status: status || 'pending',
    authorId: req.user.id,
    authorName: req.user.name || ''
  });
  res.status(201).json(row);
});

// PATCH /api/articles/:id — 기자: 본인 기사 수정 (임시저장/작성완료/송고)
articlesRouter.patch('/:id', authMiddleware, (req, res) => {
  if (req.user.role === 'reporter') {
    const { title, subtitle, category, content, content1, content2, content3, image1, image2, image3, image1_caption, image2_caption, image3_caption, status } = req.body;
    const ok = articlesDb.update(req.params.id, req.user.id, {
      title, subtitle, category, content, content1, content2, content3, image1, image2, image3, image1_caption, image2_caption, image3_caption, status
    });
    if (!ok) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    return res.json({ message: '수정되었습니다.' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'editor_in_chief') {
    return res.status(403).json({ error: '권한 없음' });
  }
  const { id } = req.params;
  const { action } = req.body;
  if (action === 'approve') {
    if (!articlesDb.updateStatus(id, 'published')) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    return res.json({ message: '승인되었습니다.', status: 'published' });
  }
  if (action === 'reject') {
    if (!articlesDb.updateStatus(id, 'rejected')) return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    return res.json({ message: '반려되었습니다.', status: 'rejected' });
  }
  return res.status(400).json({ error: 'action은 approve 또는 reject만 가능합니다.' });
});
