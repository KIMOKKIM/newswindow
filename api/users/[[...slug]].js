const { runProxy } = require('../_sharedProxy.js');

function slugToPath(q) {
  if (q == null || q === '') return '';
  const parts = Array.isArray(q) ? q : [q];
  return parts.filter((s) => s != null && String(s).length).join('/');
}

function tailFromRequestUrl(req) {
  const raw = req.url || '/';
  const pathOnly = raw.split('?')[0];
  try {
    const { pathname } = new URL(pathOnly, 'http://users-proxy.local');
    if (!pathname.startsWith('/api/users')) return '';
    let sub = pathname.slice('/api/users'.length);
    if (sub.startsWith('/')) sub = sub.slice(1);
    return sub.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

module.exports = async (req, res) => {
  const tail = slugToPath(req.query.slug) || tailFromRequestUrl(req);
  const path = tail ? `users/${tail}` : 'users';
  return runProxy(req, res, path);
};
