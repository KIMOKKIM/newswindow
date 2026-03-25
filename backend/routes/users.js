import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/db.js';

export const usersRouter = Router();
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

// GET /api/users/me — 기자 본인 정보
usersRouter.get('/me', authMiddleware, (req, res) => {
  if (req.user.role !== 'reporter') {
    return res.status(403).json({ error: '기자 전용' });
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: '사용자 없음' });
  res.json({
    id: row.id,
    userid: row.userid,
    name: row.name,
    email: row.email,
    ssn: row.ssn || '',
    phone: row.phone || '',
    address: row.address || ''
  });
});

// PATCH /api/users/me — 기자 본인 정보 수정
usersRouter.patch('/me', authMiddleware, async (req, res) => {
  if (req.user.role !== 'reporter') {
    return res.status(403).json({ error: '기자 전용' });
  }
  const bcrypt = (await import('bcryptjs')).default;
  const { name, email, ssn, phone, address, password } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: '사용자 없음' });
  const updates = [
    name !== undefined ? name : row.name,
    email !== undefined ? email : row.email,
    ssn !== undefined ? ssn : (row.ssn || ''),
    phone !== undefined ? phone : (row.phone || ''),
    address !== undefined ? address : (row.address || ''),
    password ? await bcrypt.hash(password, 10) : row.password_hash
  ];
  db.prepare(
    'UPDATE users SET name = ?, email = ?, ssn = ?, phone = ?, address = ?, password_hash = ? WHERE id = ?'
  ).run(...updates, req.user.id);
  res.json({ message: '수정되었습니다.' });
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
