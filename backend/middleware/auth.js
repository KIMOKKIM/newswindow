import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

/**
 * Bearer JWT 검증 후 req.user에 페이로드 부착.
 * role 은 항상 소문자로 정규화해 reporter / editor_in_chief / admin 비교가 안정적으로 동작하도록 한다.
 */
export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: '인증 필요' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    if (req.user && req.user.role != null) {
      req.user.role = String(req.user.role).trim().toLowerCase();
    }
    if (process.env.NW_DEBUG === '1') {
      console.log('[auth] user', { id: req.user.id, role: req.user.role });
    }
    next();
  } catch {
    return res.status(401).json({ error: '토큰 만료 또는 유효하지 않음' });
  }
}
