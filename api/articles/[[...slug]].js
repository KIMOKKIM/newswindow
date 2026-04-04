const { runProxy } = require('../_sharedProxy.js');

function slugToPath(q) {
  if (q == null || q === '') return '';
  const parts = Array.isArray(q) ? q : [q];
  return parts.filter((s) => s != null && String(s).length).join('/');
}

/**
 * Vercel에서 `req.query.slug` 가 비는 경우가 있어 GET /api/articles/16 이
 * 목록(articles)으로만 프록시되는 문제가 생김. URL pathname 으로 보조한다.
 */
function tailFromRequestUrl(req) {
  const raw = req.url || '/';
  const pathOnly = raw.split('?')[0];
  try {
    const { pathname } = new URL(pathOnly, 'http://articles-proxy.local');
    if (!pathname.startsWith('/api/articles')) return '';
    let sub = pathname.slice('/api/articles'.length);
    if (sub.startsWith('/')) sub = sub.slice(1);
    return sub.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

module.exports = async (req, res) => {
  const tail = slugToPath(req.query.slug) || tailFromRequestUrl(req);
  const path = tail ? `articles/${tail}` : 'articles';
  return runProxy(req, res, path);
};
