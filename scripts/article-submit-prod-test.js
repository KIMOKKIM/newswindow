const https = require('https');

function request(opts, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, headers: res.headers, raw });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const loginBody = JSON.stringify({ userid: 'teomok2', password: 'kim$8800811' });
  const paths = [
    { label: 'Vercel', host: 'www.newswindow.kr' },
    { label: 'Render', host: 'newswindow-backend.onrender.com' },
  ];

  for (const { label, host } of paths) {
    const login = await request(
      {
        hostname: host,
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
    let token = null;
    try {
      token = JSON.parse(login.raw).accessToken;
    } catch (_) {}

    const articlePayload = {
      title: `증거용 제목 ${Date.now()}`,
      subtitle: '',
      category: '통신',
      content1: '본문1',
      content2: '',
      content3: '',
      image1: '',
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
        hostname: host,
        path: '/api/articles',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postBody),
          Authorization: token ? `Bearer ${token}` : '',
          'Accept-Encoding': 'identity',
        },
      },
      postBody
    );

    console.log(
      JSON.stringify({
        host: label,
        loginStatus: login.status,
        hasToken: !!token,
        postStatus: post.status,
        postBodyLen: post.raw.length,
        postPreview: post.raw.slice(0, 500),
      })
    );
  }
}

main().catch(console.error);
