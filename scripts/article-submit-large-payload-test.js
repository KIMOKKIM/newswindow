const https = require('https');

function request(opts, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, raw });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

(async () => {
  const loginBody = JSON.stringify({ userid: 'teomok2', password: 'kim$8800811' });
  const login = await request(
    {
      hostname: 'www.newswindow.kr',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
        'Accept-Encoding': 'identity',
      },
    },
    loginBody
  );
  const token = JSON.parse(login.raw).accessToken;
  const big = 'x'.repeat(Math.floor(4.6 * 1024 * 1024));
  const articlePayload = {
    title: `대용량 ${Date.now()}`,
    subtitle: '',
    category: '통신',
    content1: '본문',
    content2: '',
    content3: '',
    image1: big,
    image2: '',
    image3: '',
    image1_caption: '',
    image2_caption: '',
    image3_caption: '',
    status: 'pending',
  };
  const postBody = JSON.stringify(articlePayload);
  const post = await request(
    {
      hostname: 'www.newswindow.kr',
      path: '/api/articles',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody),
        Authorization: `Bearer ${token}`,
        'Accept-Encoding': 'identity',
      },
    },
    postBody
  );
  console.log(
    JSON.stringify({
      postBodyMb: (Buffer.byteLength(postBody) / (1024 * 1024)).toFixed(2),
      postStatus: post.status,
      rawLen: post.raw.length,
      preview: post.raw.slice(0, 200),
    })
  );
})();
