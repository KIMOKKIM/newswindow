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

/**
 * Vercel 등에서 PUT/POST 본문이 req.body 에 아직 없거나, 빈 객체로만 온 경우가 있어
 * Object.keys(body).length 로 판단하면 실제 JSON 이 버려진다.
 */
async function readProxyRequestBody(req) {
  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    if (typeof req.body === 'string') return req.body;
    if (typeof req.body === 'object') return JSON.stringify(req.body);
  }
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (typeof req.on !== 'function') return undefined;
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (!chunks.length) {
        resolve(undefined);
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function runProxy(req, res, path) {
  // /api/health 는 반드시 백엔드(예: Render)로 전달한다.
  // 이전에는 여기서 단축 응답만 보내 확장 헬스 필드가 운영에서 보이지 않았다.

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
      if (path.startsWith('ads')) {
        console.log('Proxy Body:', req.body);
      }
      const rawBody = await readProxyRequestBody(req);
      if (path.startsWith('ads')) {
        const rawStr = rawBody == null ? rawBody : String(rawBody);
        console.log(
          'Proxy rawBody (forward to backend):',
          rawStr == null ? rawStr : rawStr.length > 1200 ? rawStr.slice(0, 1200) + '…[len=' + rawStr.length + ']' : rawStr,
        );
      }
      if (rawBody !== undefined && rawBody !== null && rawBody !== '') {
        opts.body = rawBody;
      }
      const hasCt = !!(opts.headers['content-type'] || opts.headers['Content-Type']);
      if (opts.body && !hasCt) opts.headers['content-type'] = 'application/json';
      if (path.startsWith('ads') && opts.body) {
        try {
          const preview = JSON.parse(String(opts.body));
          console.log(
            '[proxy] forward_body',
            JSON.stringify({
              path,
              bytes: Buffer.byteLength(String(opts.body), 'utf8'),
              keys: preview && typeof preview === 'object' && !Array.isArray(preview) ? Object.keys(preview) : null,
            })
          );
          if (req.method === 'PUT') {
            // Vercel Logs 에서 확인: 백엔드에서 병합·정규화 전, 관리자가 보낸 PUT 본문
            console.log('최종 저장 데이터(Vercel·프록시 PUT 원본):', preview);
          }
        } catch {
          console.log(
            '[proxy] forward_body_non_json',
            JSON.stringify({ path, bytes: Buffer.byteLength(String(opts.body), 'utf8') })
          );
        }
      }
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
