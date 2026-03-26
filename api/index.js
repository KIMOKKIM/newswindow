// Vercel Serverless API bridge (minimal)
// - GET /api/health -> returns {"ok": true, "timestamp": ...}
// - Other /api/* requests are proxied to BACKEND_URL if set (useful for preview)

export default async function handler(req, res) {
  const { method, url } = req;
  const path = url || '/';
  if (method === 'GET' && (path === '/api/health' || path === '/api/')) {
    res.status(200).json({ ok: true, timestamp: new Date().toISOString(), via: 'vercel-function' });
    return;
  }

  const backend = process.env.BACKEND_URL || null;
  if (!backend) {
    res.status(501).json({
      error: 'Backend not configured for proxying.',
      hint: 'Set BACKEND_URL environment variable to forward API requests in preview, or deploy the backend separately.'
    });
    return;
  }

  // Proxy request to configured backend
  try {
    const target = new URL(path, backend).toString();
    const headers = {};
    for (const [k, v] of Object.entries(req.headers || {})) {
      // skip host to avoid conflicts
      if (k.toLowerCase() === 'host') continue;
      headers[k] = v;
    }
    const fetchRes = await fetch(target, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : req.body
    });
    // copy status and headers
    res.status(fetchRes.status);
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const buf = await fetchRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(502).json({ error: 'Proxy error', message: e.message });
  }
}

