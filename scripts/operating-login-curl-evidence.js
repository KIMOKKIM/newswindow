/**
 * POST production login; prints status + body (no secrets in output except success/fail).
 */
const https = require('https');

const BASE = 'https://www.newswindow.kr';
const cases = [
  ['wrong_double_api', `${BASE}/api/api/auth/login`, 'teomok1', 'x'],
  ['correct_path_bad_pw', `${BASE}/api/auth/login`, 'teomok1', 'x'],
  ['teomok1', `${BASE}/api/auth/login`, 'teomok1', 'teomok$123'],
  ['teomok2', `${BASE}/api/auth/login`, 'teomok2', 'kim$8800811'],
  ['admin1', `${BASE}/api/auth/login`, 'admin1', 'teomok$123'],
];

function post(url, userid, password) {
  const body = JSON.stringify({ userid, password });
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: chunks.slice(0, 2000),
          });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const [label, url, uid, pw] of cases) {
    try {
      const r = await post(url, uid, pw);
      let parsed;
      try {
        parsed = JSON.parse(r.body);
      } catch {
        parsed = null;
      }
      const token = parsed && parsed.accessToken ? 'yes(len=' + String(parsed.accessToken).length + ')' : 'no';
      const role = parsed && parsed.role != null ? parsed.role : 'n/a';
      const setCookie = r.headers['set-cookie'] ? 'yes' : 'no';
      console.log('---', label);
      console.log('  URL:', url);
      console.log('  status:', r.status);
      console.log('  set-cookie:', setCookie);
      console.log('  accessToken:', token);
      console.log('  role:', role);
      console.log('  body:', r.body.slice(0, 500));
    } catch (e) {
      console.log('---', label, 'ERROR', e.message);
    }
  }
})();
