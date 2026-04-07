import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { articlesRouter } from './routes/articles.js';
import { adsRouter } from './routes/ads.js';
import { getUploadsRoot } from './config/dataPaths.js';
import { logPersistenceOnStartup, exitIfRenderMissingJsonPaths } from './lib/persistenceDiagnostics.js';
import { useSupabasePersistence } from './lib/dbMode.js';
import { getUserByUserid, createUser, updateUserRoleById } from './db/userStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const uploadsDir = getUploadsRoot();
app.use('/uploads', express.static(uploadsDir));
const PORT = process.env.PORT || 3000;
const corsOrigins = (process.env.CORS_ORIGIN ||
  'http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501,http://127.0.0.1:3000,http://localhost:3000,https://www.newswindow.kr,https://newswindow.kr'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        corsOrigins.includes(origin) ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:') ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)
      )
        return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return _json(body);
  };
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), storage: useSupabasePersistence() ? 'supabase' : 'file' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ads', adsRouter);

app.use((err, req, res, next) => {
  console.error('[api]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || '서버 오류' });
});

const adminDist = path.join(__dirname, '..', 'admin', 'dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

async function start() {
  exitIfRenderMissingJsonPaths();
  const hash = await bcrypt.hash('teomok$123', 10);
  const t1 = await getUserByUserid('teomok1');
  if (!t1) {
    await createUser({
      userid: 'teomok1',
      password_hash: hash,
      name: '편집장',
      email: 'editor@newswindow.kr',
      role: 'editor_in_chief',
      ssn: '',
      phone: '',
      address: '',
    });
    console.log('Seed: 편집장 teomok1 created');
  } else if (t1.role !== 'editor_in_chief') {
    await updateUserRoleById(t1.id, 'editor_in_chief');
    console.log('Seed: teomok1 role updated to editor_in_chief');
  }
  const a1 = await getUserByUserid('admin1');
  if (!a1) {
    await createUser({
      userid: 'admin1',
      password_hash: hash,
      name: '관리자',
      email: 'admin@newswindow.kr',
      role: 'admin',
      ssn: '',
      phone: '',
      address: '',
    });
    console.log('Seed: 관리자 admin1 created');
  }
  app.listen(PORT, () => {
    logPersistenceOnStartup();
    console.log(`Backend running at http://127.0.0.1:${PORT}`);
  });
}
start();
