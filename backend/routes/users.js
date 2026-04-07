import { Router } from 'express';
import {
  getUserById,
  updateUserProfile,
  listUsers,
  updateUserRoleById,
  userIdExists,
} from '../db/userStore.js';
import { authMiddleware } from '../middleware/auth.js';

export const usersRouter = Router();

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '관리자 전용' });
  next();
}

// GET /api/users/check?userid=xxx — 아이디 중복 확인 (기자 회원가입용)
usersRouter.get('/check', async (req, res, next) => {
  try {
    const userid = req.query.userid?.trim();
    if (!userid) return res.status(400).json({ error: 'userid 필요' });
    const exists = await userIdExists(userid);
    res.json({ available: !exists });
  } catch (e) {
    next(e);
  }
});

// GET /api/users/me — 기자 본인 정보
usersRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'reporter') {
      return res.status(403).json({ error: '기자 전용' });
    }
    const row = await getUserById(req.user.id);
    if (!row) return res.status(404).json({ error: '사용자 없음' });
    res.json({
      id: row.id,
      userid: row.userid,
      name: row.name,
      email: row.email,
      ssn: row.ssn || '',
      phone: row.phone || '',
      address: row.address || '',
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/users/me — 기자 본인 정보 수정
usersRouter.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'reporter') {
      return res.status(403).json({ error: '기자 전용' });
    }
    const bcrypt = (await import('bcryptjs')).default;
    const { name, email, ssn, phone, address, password } = req.body;
    const row = await getUserById(req.user.id);
    if (!row) return res.status(404).json({ error: '사용자 없음' });
    await updateUserProfile(req.user.id, {
      name: name !== undefined ? name : row.name,
      email: email !== undefined ? email : row.email,
      ssn: ssn !== undefined ? ssn : row.ssn || '',
      phone: phone !== undefined ? phone : row.phone || '',
      address: address !== undefined ? address : row.address || '',
      password_hash: password ? await bcrypt.hash(password, 10) : row.password_hash,
    });
    res.json({ message: '수정되었습니다.' });
  } catch (e) {
    next(e);
  }
});

// GET /api/users — 관리자 전용 사용자 목록
usersRouter.get('/', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const rows = await listUsers('admin');
      return res.json(rows);
    }
    if (req.user.role === 'editor_in_chief') {
      const rows = await listUsers('editor_in_chief');
      return res.json(rows);
    }
    return res.status(403).json({ error: '권한 없음' });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/users/:id — 관리자 전용 역할 변경
usersRouter.patch('/:id', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['reporter', 'editor_in_chief'].includes(role)) {
      return res.status(400).json({ error: 'role은 reporter 또는 editor_in_chief만 가능' });
    }
    const row = await getUserById(Number(id));
    if (!row) return res.status(404).json({ error: '사용자 없음' });
    await updateUserRoleById(Number(id), role);
    res.json({ message: '역할이 변경되었습니다.' });
  } catch (e) {
    next(e);
  }
});
