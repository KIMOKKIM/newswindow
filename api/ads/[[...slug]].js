const { runProxy } = require('../_sharedProxy.js');

function slugToPath(q) {
  if (q == null || q === '') return '';
  const parts = Array.isArray(q) ? q : [q];
  return parts.filter((s) => s != null && String(s).length).join('/');
}

/** Vercel에서 slug 쿼리 누락 시 POST /api/ads/upload 가 ads 로만 프록시되어 405/404 나는 문제 방지 */
function tailFromRequestUrl(req) {
  const raw = req.url || '/';
  const pathOnly = raw.split('?')[0];
  try {
    const { pathname } = new URL(pathOnly, 'http://ads-proxy.local');
    if (!pathname.startsWith('/api/ads')) return '';
    let sub = pathname.slice('/api/ads'.length);
    if (sub.startsWith('/')) sub = sub.slice(1);
    return sub.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

module.exports = async (req, res) => {
  const tail = slugToPath(req.query.slug) || tailFromRequestUrl(req);
  const path = tail ? `ads/${tail}` : 'ads';
  return runProxy(req, res, path);
};
