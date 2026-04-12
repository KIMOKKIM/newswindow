import { randomUUID } from 'crypto';

const SLOW_MS = (() => {
  const n = Number(process.env.NW_HTTP_SLOW_MS);
  if (Number.isFinite(n) && n >= 100) return Math.min(n, 120_000);
  return 2000;
})();

/**
 * Route tag for log correlation (not full path — avoids huge query strings in logs).
 * @param {string} pathNoQuery
 */
export function nwHttpRouteTag(pathNoQuery) {
  const p = String(pathNoQuery || '').split('?')[0];
  if (p.startsWith('/api/auth')) return 'auth';
  if (p.startsWith('/api/users')) return 'users';
  if (p.startsWith('/api/home')) return 'home';
  if (p.startsWith('/api/health')) return 'health';
  if (p.startsWith('/api/ads')) return 'ads';
  if (p.startsWith('/api/articles/public/list')) return 'articles.list';
  if (p.startsWith('/api/articles/public/latest')) return 'articles.latest';
  if (p.startsWith('/api/articles/public/page')) return 'articles.page';
  if (p.startsWith('/api/articles/public/popular')) return 'articles.popular';
  if (p.startsWith('/api/articles/public/sitemap')) return 'articles.sitemap';
  if (/^\/api\/articles\/public\/\d+/.test(p)) return 'articles.detail';
  if (p.startsWith('/api/articles')) return 'articles';
  return 'api';
}

/**
 * Assigns X-Request-Id, logs on response finish: [nw/http] and [nw/http/slow] when ms > SLOW_MS.
 * Sets req.nwRequestId for handlers.
 */
export function requestLogMiddleware(req, res, next) {
  const id = randomUUID();
  req.nwRequestId = id;
  res.setHeader('X-Request-Id', id);
  const prevExpose = res.getHeader('Access-Control-Expose-Headers');
  const expose =
    typeof prevExpose === 'string' && prevExpose.trim()
      ? `${String(prevExpose).trim()}, X-Request-Id`
      : 'X-Request-Id';
  res.setHeader('Access-Control-Expose-Headers', expose);

  const started = Date.now();
  const pathLabel = (req.originalUrl || req.url || '').split('?')[0];
  const tag = nwHttpRouteTag(pathLabel);

  res.on('finish', () => {
    const ms = Date.now() - started;
    const status = res.statusCode;
    const line = JSON.stringify({
      tag,
      id,
      method: req.method,
      path: pathLabel,
      status,
      ms,
    });
    if (ms >= SLOW_MS) {
      console.warn('[nw/http/slow]', line);
    } else {
      console.log('[nw/http]', line);
    }
  });

  next();
}
