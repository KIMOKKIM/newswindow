import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

// Route imports - wrapped in try-catch for debugging
let authRouter, usersRouter, articlesRouter, adsRouter, spellCheckRouter, db;

try {
  const auth = await import('./routes/auth.js');
  authRouter = auth.authRouter;
  console.log('[v0] auth.js loaded');
} catch (e) {
  console.error('[v0] Failed to load auth.js:', e.message);
}

try {
  const users = await import('./routes/users.js');
  usersRouter = users.usersRouter;
  console.log('[v0] users.js loaded');
} catch (e) {
  console.error('[v0] Failed to load users.js:', e.message);
}

try {
  const articles = await import('./routes/articles.js');
  articlesRouter = articles.articlesRouter;
  console.log('[v0] articles.js loaded');
} catch (e) {
  console.error('[v0] Failed to load articles.js:', e.message);
}

try {
  const ads = await import('./routes/ads.js');
  adsRouter = ads.adsRouter;
  console.log('[v0] ads.js loaded');
} catch (e) {
  console.error('[v0] Failed to load ads.js:', e.message);
}

try {
  const spellCheck = await import('./routes/spell-check.js');
  spellCheckRouter = spellCheck.spellCheckRouter;
  console.log('[v0] spell-check.js loaded');
} catch (e) {
  console.error('[v0] Failed to load spell-check.js:', e.message);
}

try {
  const database = await import('./db/db.js');
  db = database.db;
  console.log('[v0] db.js loaded');
} catch (e) {
  console.error('[v0] Failed to load db.js:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(path.join(__dirname, '..'));

console.log('[v0] Project root:', projectRoot);

// CORS settings
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

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return _json(body);
  };
  next();
});

// Serve uploaded ad images
const uploadsDir = path.join(projectRoot, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ===== API routes (before static files) =====
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

if (authRouter) app.use('/api/auth', authRouter);
if (usersRouter) app.use('/api/users', usersRouter);
if (articlesRouter) app.use('/api/articles', articlesRouter);
if (adsRouter) app.use('/api/ads', adsRouter);
if (spellCheckRouter) app.use('/api/spell-check', spellCheckRouter);

// ===== Static file serving (last) =====
app.use(express.static(projectRoot));

// Root and SPA fallback
app.get('/', (req, res) => {
  console.log('[v0] GET / - Sending index.html');
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('*', (req, res) => {
  console.log('[v0] GET * - Catch-all SPA fallback for:', req.path);
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// Initialize database
async function initializeDatabase() {
  if (!db) {
    console.log('[v0] Database not available, skipping initialization');
    return;
  }
  try {
    const hash = await bcrypt.hash('teomok$123', 10);
    // Editor-in-chief: teomok1
    const t1 = db.prepare('SELECT * FROM users WHERE userid = ?').get('teomok1');
    if (!t1) {
      db.prepare('INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
        .run('teomok1', hash, '편집장', 'editor@newswindow.kr', 'editor_in_chief');
      console.log('[v0] Created editor-in-chief teomok1');
    }
    const a1 = db.prepare('SELECT * FROM users WHERE userid = ?').get('admin1');
    if (!a1) {
      db.prepare('INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
        .run('admin1', hash, '관리자', 'admin@newswindow.kr', 'admin');
      console.log('[v0] Created admin admin1');
    }
  } catch (e) {
    console.error('[v0] Database initialization error:', e.message);
  }
}

// Start server
function startServer() {
  let currentPort = PORT;
  
  function tryListen(port) {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[v0] ✓ Server running at http://127.0.0.1:${port}`);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[v0] Port ${port} is in use, trying ${port + 1}...`);
        currentPort = port + 1;
        tryListen(currentPort);
      } else {
        console.error('[v0] Server startup error:', err.message);
        setTimeout(() => tryListen(currentPort), 1000);
      }
    });
  }
  
  tryListen(currentPort);
}

// Main
(async () => {
  console.log('[v0] Server starting...');
  await initializeDatabase();
  startServer();
})().catch(e => {
  console.error('[v0] Fatal error:', e);
  process.exit(1);
});
