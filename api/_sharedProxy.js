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
    delete headers.connection;
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    headers['accept-encoding'] = 'identity';
    const opts = { method: req.method, headers, redirect: 'manual' };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      opts.body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
      if (opts.body && !opts.headers['content-type']) opts.headers['content-type'] = 'application/json';
    }
    const r = await fetch(target, opts);
    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);
    res.statusCode = r.status;
    const hopByHop = new Set(['transfer-encoding', 'content-encoding', 'content-length', 'connection', 'content-type']);
    r.headers.forEach((v, k) => {
      if (hopByHop.has(k.toLowerCase())) return;
      res.setHeader(k, v);
    });
    const upstreamCt = r.headers.get('content-type');
    const contentType =
      upstreamCt && String(upstreamCt).trim() ? String(upstreamCt).trim() : 'application/json; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buf.byteLength));
    if (buf.length === 0) {
      console.error(
        '[proxy] empty_upstream_body',
        JSON.stringify({ path, target, upstreamStatus: r.status, contentType })
      );
    } else if (contentType.toLowerCase().includes('application/json')) {
      try {
        JSON.parse(buf.toString('utf8'));
      } catch (parseErr) {
        console.error(
          '[proxy] upstream_body_not_json',
          JSON.stringify({
            path,
            target,
            upstreamStatus: r.status,
            message: String(parseErr && parseErr.message),
            preview: buf.toString('utf8').slice(0, 400),
          })
        );
      }
    }
    res.end(buf);
  } catch (e) {
    console.error('[proxy] fetch_failed', JSON.stringify({ path, target, message: String(e && e.message) }));
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
