// catch-all proxy for /api/* to forward to BACKEND_URL when present (helps Vercel preview connect to external backend)
export default async function handler(req, res) {
  const backend = process.env.BACKEND_URL || '';
  if (!backend) {
    return res.status(502).json({ error: 'no_backend', message: 'BACKEND_URL not configured on server' });
  }
  try {
    const parts = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
    const pathSuffix = parts.join('/');
    const url = backend.replace(/\/$/, '') + '/' + pathSuffix + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    const init = {
      method: req.method,
      headers: Object.assign({}, req.headers)
    };
    // Remove host headers that may interfere
    delete init.headers.host;
    // Prepare body if present
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', () => resolve(null));
      });
    }
    const r = await fetch(url, init);
    const headers = {};
    r.headers.forEach((v, k) => { headers[k] = v; });
    // Copy status and headers
    res.statusCode = r.status;
    Object.entries(headers).forEach(([k, v]) => {
      // Vercel may disallow some headers; pass most common ones
      res.setHeader(k, v);
    });
    const buffer = await r.arrayBuffer();
    res.end(Buffer.from(buffer));
  } catch (e) {
    res.statusCode = 500;
    res.json({ error: 'proxy_error', message: String(e && e.message) });
  }
}

