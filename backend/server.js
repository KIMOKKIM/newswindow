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
import { db } from './db/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
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
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ads', adsRouter);

const adminDist = path.join(__dirname, '..', 'admin', 'dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

async function start() {
  const hash = await bcrypt.hash('teomok$123', 10);
  // 편집장: teomok1
  const t1 = db.prepare('SELECT * FROM users WHERE userid = ?').get('teomok1');
  if (!t1) {
    db.prepare('INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
      .run('teomok1', hash, '편집장', 'editor@newswindow.kr', 'editor_in_chief');
    console.log('Seed: 편집장 teomok1 created');
  } else if (t1.role !== 'editor_in_chief') {
    db.prepare('UPDATE users SET role = ? WHERE userid = ?').run('editor_in_chief', 'teomok1');
    console.log('Seed: teomok1 role updated to editor_in_chief');
  }
  // 관리자: admin1 (테스트용)
  const a1 = db.prepare('SELECT * FROM users WHERE userid = ?').get('admin1');
  if (!a1) {
    db.prepare('INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
      .run('admin1', hash, '관리자', 'admin@newswindow.kr', 'admin');
    console.log('Seed: 관리자 admin1 created');
  }
  app.listen(PORT, () => {
    console.log(`Backend running at http://127.0.0.1:${PORT}`);
  });
}
start();
