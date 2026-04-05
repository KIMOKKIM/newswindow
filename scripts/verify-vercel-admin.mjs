/**
 * Vercel 정적 규칙을 단순 모사: 실제 파일이 있으면 파일, 없으면 /admin → index.html
 */
import { createServer, request as httpRequest } from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const adminDir = join(root, 'admin');
const distDir = join(adminDir, 'dist');
const sandbox = join(root, '.vercel-admin-sandbox');

function copyDirContents(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const name of readdirSync(srcDir)) {
    const s = join(srcDir, name);
    const d = join(destDir, name);
    cpSync(s, d, { recursive: true, force: true });
  }
}

function ensureFreshBuild() {
  const r =
    process.platform === 'win32'
      ? spawnSync('npm run build', { cwd: adminDir, stdio: 'inherit', env: process.env, shell: true })
      : spawnSync('npm', ['run', 'build'], { cwd: adminDir, stdio: 'inherit', env: process.env, shell: false });
  if (r.status !== 0) {
    console.error(`verify: npm run build failed in admin (status ${r.status})`);
    process.exit(1);
  }
}

function mime(p) {
  const e = extname(p).toLowerCase();
  if (e === '.js') return 'application/javascript; charset=utf-8';
  if (e === '.css') return 'text/css; charset=utf-8';
  if (e === '.html') return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

/** Windows에서 global fetch 종료 시 libuv assertion 방지 — Connection: close request */
function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = httpRequest(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        headers: { Connection: 'close', Accept: '*/*' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: { get: (n) => res.headers[n.toLowerCase()] },
            text: async () => body,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function main() {
  ensureFreshBuild();
  if (!existsSync(distDir)) {
    console.error('verify: admin/dist missing');
    process.exit(1);
  }

  rmSync(sandbox, { recursive: true, force: true });
  mkdirSync(join(sandbox, 'admin'), { recursive: true });
  copyDirContents(distDir, join(sandbox, 'admin'));

  const port = Number(process.env.VERIFY_PORT || 9876);
  const server = createServer((req, res) => {
    const raw = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let pathname = decodeURIComponent(raw.pathname);
    if (!pathname.startsWith('/admin')) {
      res.writeHead(404);
      res.end('only /admin simulated');
      return;
    }

    const rel = pathname.slice('/admin'.length).replace(/^\//, '');
    const candidate = normalize(join(sandbox, 'admin', rel)).replace(/\\/g, '/');
    const base = normalize(join(sandbox, 'admin')).replace(/\\/g, '/');
    if (!candidate.startsWith(base)) {
      res.writeHead(400);
      res.end('bad path');
      return;
    }

    if (rel && existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        const body = readFileSync(candidate);
        res.writeHead(200, { 'Content-Type': mime(candidate) });
        res.end(body);
        return;
      } catch {
        /* fall through */
      }
    }

    const indexHtml = join(sandbox, 'admin', 'index.html');
    if (existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(indexHtml));
      return;
    }
    res.writeHead(500);
    res.end('no index');
  });

  server.on('error', (err) => {
    console.error('verify: server error', err);
    process.exit(1);
  });

  server.listen(port, '127.0.0.1', async () => {
    console.log(`verify: sandbox server http://127.0.0.1:${port}`);

    const tests = [
      ['GET /admin (expect 200 HTML)', `http://127.0.0.1:${port}/admin`],
      ['GET /admin/ (expect 200 HTML)', `http://127.0.0.1:${port}/admin/`],
      [
        'GET deep link /admin/reporter/dashboard (expect 200 SPA shell)',
        `http://127.0.0.1:${port}/admin/reporter/dashboard`,
      ],
    ];

    let assetUrl = '';
    try {
      const assetsDir = join(sandbox, 'admin', 'assets');
      const first = readdirSync(assetsDir).find((f) => f.endsWith('.js'));
      if (first) assetUrl = `http://127.0.0.1:${port}/admin/assets/${first}`;
    } catch {
      /* ignore */
    }
    if (assetUrl) tests.push(['GET bundled JS (expect 200)', assetUrl]);

    let failed = false;
    for (const [label, url] of tests) {
      const r = await httpGet(url);
      const ok = r.ok;
      const ct = r.headers.get('content-type') || '';
      const snippet = ok ? (await r.text()).slice(0, 60).replace(/\s+/g, ' ') : await r.text();
      console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
      console.log(`  status=${r.status} content-type=${ct}`);
      if (!ok || (label.includes('HTML') && !ct.includes('html'))) {
        console.log(`  body: ${snippet}`);
        failed = true;
      }
      if (label.includes('JS') && ok && !ct.includes('javascript') && !ct.includes('js')) {
        console.log(`  warn: unexpected content-type for JS`);
      }
    }

    const done = (code) => {
      try {
        rmSync(sandbox, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      console.log(
        code
          ? '\nverify: FAILED'
          : '\nverify: all checks passed (local simulation; production also needs vercel.json rewrites).'
      );
      setTimeout(() => process.exit(code), 0);
    };

    server.close(() => done(failed ? 1 : 0));
  });
}

main();
