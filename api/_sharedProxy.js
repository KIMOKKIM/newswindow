/* Private module: not deployed as its own route (leading _). */
const BACKEND = process.env.BACKEND_URL || '';

function getApiSubpath(req) {
  const q = req.query && req.query.path;
  if (q !== undefined && q !== null && q !== '') {
    const fromQ = Array.isArray(q) ? q.filter((s) => s != null && String(s).length).join('/') : String(q);
    if (fromQ !== '') return fromQ.replace(/\/+$/, '');
  }
  const raw = req.url || '/';
  const pathOnly = raw.split('?')[0];
  try {
    const { pathname } = new URL(pathOnly, 'http://vercel-handler.local');
    if (!pathname.startsWith('/api')) return '';
    let sub = pathname.slice('/api'.length);
    if (sub.startsWith('/')) sub = sub.slice(1);
    return sub.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function normalizeBackendBase(raw) {
  let base = String(raw || '').trim();
  if (!base) return '';
  base = base.replace(/\/+$/, '');
  if (base.length >= 4 && base.slice(-4).toLowerCase() === '/api') {
    base = base.slice(0, -4).replace(/\/+$/, '');
  }
  return base;
}

function getSearch(req) {
  const raw = req.url || '';
  const i = raw.indexOf('?');
  return i >= 0 ? raw.slice(i) : '';
}

async function runProxy(req, res, path) {
  if (path === 'health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, source: 'vercel-api-health' }));
    return;
  }

  if (!BACKEND) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'backend_not_configured' }));
    return;
  }

  const base = normalizeBackendBase(BACKEND);
  const search = getSearch(req);
  const target = `${base}/api/${path}${search}`;

  try {
    const headers = { ...req.headers };
    delete headers.host;
    const opts = { method: req.method, headers, redirect: 'manual' };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      opts.body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
      if (opts.body && !opts.headers['content-type']) opts.headers['content-type'] = 'application/json';
    }
    const r = await fetch(target, opts);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(k, v);
    });
    const buf = await r.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'proxy_error', message: String(e && e.message) }));
  }
}

async function handle(req, res) {
  return runProxy(req, res, getApiSubpath(req));
}

module.exports = handle;
module.exports.runProxy = runProxy;
