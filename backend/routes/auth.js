import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUserByUserid, userIdExists } from '../db/userStore.js';
import {
  authUpstreamUserFacingError,
  isLikelyUpstreamFailure,
  logAuthUpstreamFail,
} from '../lib/publicReadSoftFail.js';

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

authRouter.post('/login', async (req, res) => {
  const t0 = Date.now();
  const useridRaw = req.body && req.body.userid != null ? String(req.body.userid) : '';
  try {
    const { userid, password } = req.body;
    if (!userid || !password) {
      console.log(
        '[nw/auth/login]',
        JSON.stringify({
          reqId: req.nwRequestId,
          ok: false,
          reason: 'missing_fields',
          ms: Date.now() - t0,
          userid: useridRaw,
        }),
      );
      return res.status(400).json({ error: 'userid와 password가 필요합니다.' });
    }
    if ((process.env.NODE_ENV || 'development') !== 'production') {
      console.log('[auth-debug] login attempt:', { userid, passwordLen: (password || '').length });
    }
    const row = await getUserByUserid(userid);
    if (!row) {
      console.log(
        '[nw/auth/login]',
        JSON.stringify({
          reqId: req.nwRequestId,
          ok: false,
          reason: 'unknown_user',
          ms: Date.now() - t0,
          userid: String(userid),
        }),
      );
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) {
      console.log(
        '[nw/auth/login]',
        JSON.stringify({
          reqId: req.nwRequestId,
          ok: false,
          reason: 'bad_password',
          ms: Date.now() - t0,
          userid: String(userid),
        }),
      );
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const roleNorm = String(row.role || '').trim().toLowerCase();
    const token = jwt.sign(
      { id: row.id, userid: row.userid, role: roleNorm, name: row.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(
      '[nw/auth/login]',
      JSON.stringify({
        ok: true,
        ms: Date.now() - t0,
        userid: String(userid),
        role: roleNorm,
        userId: row.id,
      }),
    );
    res.json({ accessToken: token, role: roleNorm, name: row.name, id: row.id });
  } catch (e) {
    logAuthUpstreamFail(req.nwRequestId, e, { route: 'POST /login', userid: useridRaw });
    const upstream = isLikelyUpstreamFailure(e);
    const status = upstream ? 503 : 500;
    res.status(status).json({
      error: authUpstreamUserFacingError(),
      code: upstream ? 'UPSTREAM_UNAVAILABLE' : 'INTERNAL_ERROR',
    });
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const { userid, password, name, email, role, ssn, phone, address } = req.body;
    if (!userid || !password || !name || !email || !role) {
      return res.status(400).json({ error: 'userid, password, name, email, role 필수' });
    }
    const roleNorm = String(role || '').trim().toLowerCase();
    if (!['reporter', 'editor_in_chief'].includes(roleNorm)) {
      return res.status(400).json({ error: 'role은 reporter 또는 editor_in_chief만 허용' });
    }
    if (await userIdExists(userid)) {
      return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await createUser({
      userid,
      password_hash: hash,
      name,
      email,
      role: roleNorm,
      ssn,
      phone,
      address,
    });
    res.status(201).json({
      message: '회원가입 완료',
      role: roleNorm,
      dashboardInfo:
        roleNorm === 'reporter' || roleNorm === 'editor_in_chief'
          ? '편집장 및 관리자 대시보드 기자리스트에 반영됩니다.'
          : null,
    });
  } catch (e) {
    logAuthUpstreamFail(req.nwRequestId, e, { route: 'POST /signup' });
    const upstream = isLikelyUpstreamFailure(e);
    const status = upstream ? 503 : 500;
    res.status(status).json({
      error: authUpstreamUserFacingError(),
      code: upstream ? 'UPSTREAM_UNAVAILABLE' : 'INTERNAL_ERROR',
    });
  }
});
