const { runProxy } = require('../_sharedProxy.js');

function slugToPath(q) {
  if (q == null || q === '') return '';
  const parts = Array.isArray(q) ? q : [q];
  return parts.filter((s) => s != null && String(s).length).join('/');
}

module.exports = async (req, res) => {
  const tail = slugToPath(req.query.slug);
  const path = tail ? `articles/${tail}` : 'articles';
  return runProxy(req, res, path);
};
