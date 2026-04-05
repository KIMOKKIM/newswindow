const https = require('https');
const cases = [
  ['admin1', 'teomok$123'],
  ['teomok1', 'teomok$123'],
  ['teomok2', 'kim$8800811'],
];
function post(userid, password) {
  const body = JSON.stringify({ userid, password });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'www.newswindow.kr',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Accept-Encoding': 'identity',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let j;
          try {
            j = JSON.parse(raw);
          } catch (e) {
            j = { _parseError: String(e.message), rawStart: raw.slice(0, 400), rawLen: raw.length };
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: j,
            rawLen: raw.length,
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
  for (const [uid, pw] of cases) {
    const x = await post(uid, pw);
    const b = x.body;
    const row = {
      userid: uid,
      url: 'POST https://www.newswindow.kr/api/auth/login',
      bodySent: { userid: uid, password: '(redacted)' },
      status: x.status,
      contentType: x.headers['content-type'],
      responseKeys: b && typeof b === 'object' ? Object.keys(b) : [],
      accessToken: !!(b && b.accessToken),
      setCookie: !!(x.headers && x.headers['set-cookie']),
      role: b ? b.role : null,
      successFlag: b ? b.success : undefined,
      error: b ? b.error : undefined,
      parseError: b && b._parseError,
      rawPreview: b && b.rawStart,
      rawLen: b && b.rawLen,
    };
    console.log(JSON.stringify(row));
  }
})();
