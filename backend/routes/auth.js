import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

authRouter.post('/login', (req, res) => {
  try {
    const { userid, password } = req.body;
    if (!userid || !password) {
      return res.status(400).json({ error: 'userid와 password가 필요합니다.' });
    }
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      console.log('[auth-debug] login attempt:', { userid, passwordLen: (password || '').length });
    }
    const row = db.prepare('SELECT * FROM users WHERE userid = ?').get(userid);
    if (!row) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    // Development convenience: allow known staff to login with developer password locally
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      const devStaff = ['teomok1', 'teomok2', 'admin1'];
      if (devStaff.includes(userid) && password === 'teomok$123') {
        // bypass password check in dev
      } else {
        const ok = bcrypt.compareSync(password, row.password_hash);
        if (!ok) {
          return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }
      }
    } else {
      const ok = bcrypt.compareSync(password, row.password_hash);
      if (!ok) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      }
    }
    const token = jwt.sign(
      { id: row.id, userid: row.userid, role: row.role, name: row.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ accessToken: token, role: row.role, name: row.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const { userid, password, name, email, role, ssn, phone, address } = req.body;
    if (!userid || !password || !name || !email || !role) {
      return res.status(400).json({ error: 'userid, password, name, email, role 필수' });
    }
    if (!['reporter', 'editor_in_chief'].includes(role)) {
      return res.status(400).json({ error: 'role은 reporter 또는 editor_in_chief만 허용' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE userid = ?').get(userid);
    if (exists) {
      return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const hash = await bcrypt.hash(password, 10);
    db.prepare(
      'INSERT INTO users (userid, password_hash, name, email, role, ssn, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(userid, hash, name, email, role, ssn || '', phone || '', address || '');
    res.status(201).json({
      message: '회원가입 완료',
      role,
      dashboardInfo: (role === 'reporter' || role === 'editor_in_chief')
        ? '편집장 및 관리자 대시보드 기자리스트에 반영됩니다.' : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
