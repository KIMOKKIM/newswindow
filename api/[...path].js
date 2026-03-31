// Use global fetch (Node 18+ / Vercel runtime) to avoid bundling issues
const BACKEND = process.env.BACKEND_URL || '';

export default async function handler(req, res) {
  if (!BACKEND) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'backend_not_configured' }));
    return;
  }

  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  const target = `${BACKEND.replace(/\/$/, '')}/${path}`;

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

