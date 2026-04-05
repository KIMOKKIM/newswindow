const https = require('https');
const targets = [
  { name: 'Render_direct', hostname: 'newswindow-backend.onrender.com', path: '/api/auth/login' },
  { name: 'Vercel_proxy', hostname: 'www.newswindow.kr', path: '/api/auth/login' },
];
const cases = [
  ['admin1', 'teomok$123'],
  ['teomok1', 'teomok$123'],
  ['teomok2', 'kim$8800811'],
];

function post(hostname, path, userid, password) {
  const body = JSON.stringify({ userid, password });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
          'Accept-Encoding': 'identity',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const rawText = raw.toString('utf8');
          let parsed = null;
          let parseErr = null;
          try {
            parsed = JSON.parse(rawText);
          } catch (e) {
            parseErr = e.message;
          }
          const headers = { ...res.headers };
          const headerDump = Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])
          );
          resolve({
            status: res.statusCode,
            headers,
            headerDump,
            contentType: headers['content-type'] || '',
            contentLengthHeader: headers['content-length'],
            rawLen: raw.length,
            rawText,
            jsonParseOk: !parseErr,
            parseErr,
            parsed,
            accessToken: !!(parsed && parsed.accessToken),
            role: parsed && parsed.role != null ? parsed.role : null,
            setCookie: !!headers['set-cookie'],
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
    for (const t of targets) {
      const row = await post(t.hostname, t.path, uid, pw);
      console.log(
        JSON.stringify({
          account: uid,
          target: t.name,
          status: row.status,
          contentType: row.contentType,
          contentLengthHeader: row.contentLengthHeader,
          contentEncoding: row.headerDump['content-encoding'],
          setCookie: row.setCookie,
          rawLen: row.rawLen,
          rawPreview: row.rawText.slice(0, 500),
          jsonParseOk: row.jsonParseOk,
          parseErr: row.parseErr || undefined,
          accessToken: row.accessToken,
          role: row.role,
        })
      );
    }
  }
})();
