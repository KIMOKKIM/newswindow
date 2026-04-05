const https = require('https');
function get(opts) {
  return new Promise((resolve, reject) => {
    https
      .get(opts, (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve({ status: res.statusCode, body: b }));
      })
      .on('error', reject);
  });
}
const loginBody = JSON.stringify({ userid: 'teomok2', password: 'kim$8800811' });
function post(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
(async () => {
  const login = await post(
    {
      hostname: 'www.newswindow.kr',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
      },
    },
    loginBody
  );
  const token = JSON.parse(login.body).accessToken;
  const list = await get({
    hostname: 'www.newswindow.kr',
    path: '/api/articles',
    headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
  });
  const arr = JSON.parse(list.body);
  const titles = arr.slice(0, 5).map((a) => ({ id: a.id, title: (a.title || '').slice(0, 40) }));
  console.log(JSON.stringify({ listStatus: list.status, count: arr.length, first5: titles }));
})();
