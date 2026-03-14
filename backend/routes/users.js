import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';

export const usersRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증 필요' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: '토큰 만료 또는 유효하지 않음' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '관리자 전용' });
  next();
}

// GET /api/users/check?userid=xxx — 아이디 중복 확인 (기자 회원가입용)
usersRouter.get('/check', (req, res) => {
  const userid = req.query.userid?.trim();
  if (!userid) return res.status(400).json({ error: 'userid 필요' });
  const row = db.prepare('SELECT id FROM users WHERE userid = ?').get(userid);
  res.json({ available: !row });
});

// GET /api/users — 관리자 전용 사용자 목록
usersRouter.get('/', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    const rows = db.prepare(
      'SELECT id, userid, name, email, role, created_at FROM users ORDER BY created_at DESC'
    ).all();
    return res.json(rows);
  }
  if (req.user.role === 'editor_in_chief') {
    const rows = db.prepare(
      'SELECT id, userid, name, email, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC'
    ).all('reporter');
    return res.json(rows);
  }
  return res.status(403).json({ error: '권한 없음' });
});

// PATCH /api/users/:id — 관리자 전용 역할 변경
usersRouter.patch('/:id', authMiddleware, adminOnly, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['reporter', 'editor_in_chief'].includes(role)) {
    return res.status(400).json({ error: 'role은 reporter 또는 editor_in_chief만 가능' });
  }
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(id));
  if (!row) return res.status(404).json({ error: '사용자 없음' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, Number(id));
  res.json({ message: '역할이 변경되었습니다.' });
});
