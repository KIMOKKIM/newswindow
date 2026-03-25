import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { articlesRouter } from './routes/articles.js';
import { adsRouter } from './routes/ads.js';
import { spellCheckRouter } from './routes/spell-check.js';
import { db } from './db/db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const projectRoot = path.join(process.cwd());

// CORS 설정
const corsOrigins = (process.env.CORS_ORIGIN || 'http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501,http://127.0.0.1:3000,http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.includes(origin) || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:'))
      cb(null, true);
    else
      cb(null, corsOrigins[0]);
  },
  credentials: true
}));

// 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return _json(body);
  };
  next();
});

// 업로드된 광고 이미지 제공
const uploadsDir = path.join(projectRoot, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ===== API 라우트 (정적 파일보다 먼저) =====
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ads', adsRouter);
app.use('/api/spell-check', spellCheckRouter);

// ===== 정적 파일 제공 (마지막) =====
app.use(express.static(projectRoot));

// 루트 경로와 기타 경로에서 index.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// SPA 폴백: 정의되지 않은 라우트는 index.html로
app.get('*', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

async function start() {
  try {
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
  } catch (e) {
    console.error('Seed error:', e.message);
  }
  
  let currentPort = PORT;
  
  function tryListen(port) {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[v0] Backend running at http://127.0.0.1:${port}`);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying port ${port + 1}...`);
        currentPort = port + 1;
        tryListen(currentPort);
      } else {
        console.error('Server error:', err);
        throw err;
      }
    });
  }
  
  tryListen(currentPort);
}

start();
