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
import { homeRouter } from './routes/home.js';
import { healthRouter, HEALTH_ROUTE_VERSION } from './routes/health.js';
import { getUploadsRoot } from './config/dataPaths.js';
import { logPersistenceOnStartup, exitIfRenderMissingJsonPaths } from './lib/persistenceDiagnostics.js';
import { assertSupabaseRequiredAtStartup } from './lib/supabaseServer.js';
import { getUserByUserid, createUser, updateUserRoleById } from './db/userStore.js';
import { bootState } from './lib/bootState.js';
import { logSupabaseEnvStatus, fatalStartupOneLine } from './lib/startupLog.js';
import { requestLogMiddleware } from './middleware/requestLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
console.log(
  '[newswindow-backend] entry=backend/server.js health=' + HEALTH_ROUTE_VERSION + ' (Render: set rootDir=backend, start=npm start)',
);
const uploadsDir = getUploadsRoot();
app.use('/uploads', express.static(uploadsDir));
const PORT = process.env.PORT || 3000;
const corsOrigins = (process.env.CORS_ORIGIN ||
  'http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501,http://127.0.0.1:3000,http://localhost:3000,https://www.newswindow.kr,https://newswindow.kr'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Ensure JSON error responses still get Access-Control-Allow-Origin when Origin is allowed. */
function nwReflectCorsHeadersOnError(req, res) {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== 'string') return;
  if (
    corsOrigins.includes(origin) ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://localhost:') ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        corsOrigins.includes(origin) ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:') ||
        /^http:\/\/127\.0.0\.1:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)
      )
        return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    exposedHeaders: [
      'X-Request-Id',
      'X-NW-Degraded',
      'X-NW-Degraded-Reason',
      'X-NW-Soft-Fail',
      'X-NW-Home-Headlines-Ms',
      'X-NW-Headlines-Db-Ms',
      'X-NW-Cache',
      'X-NW-Public-Latest-Hero',
      'X-NW-Public-Latest-Timing-Ms',
      'X-NW-Public-Latest-Json-Bytes',
      'X-NW-Public-Main-Slim',
      'X-NW-Home-Timing-Wall-Ms',
      'X-NW-Home-Latest-Ok',
      'X-NW-Home-Partial',
    ],
  })
);
app.use(requestLogMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  const _json = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return _json(body);
  };
  next();
});

/** 단일 진입: 다른 app.get('/api/health') 는 정의하지 말 것 */
app.use('/api/health', healthRouter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ads', adsRouter);
app.use('/api/home', homeRouter);

app.use((err, req, res, next) => {
  console.error('[api]', err);
  if (res.headersSent) return next(err);
  nwReflectCorsHeadersOnError(req, res);
  const status = Number(err.statusCode || err.status);
  const httpStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;
  const code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  const defaultMsg =
    '\uc77c\uc2dc\uc801\uc778 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.';
  if (err && err.message && String(err.message).length < 800) {
    console.error('[api] err.message (not sent to client):', String(err.message).slice(0, 500));
  }
  const url = String(req.originalUrl || req.url || '');
  const authApi = url.startsWith('/api/auth');
  // Never forward raw DB/PostgREST/timeout strings to clients (dev or prod).
  const errorOut = authApi
    ? defaultMsg
    : err.publicMessage != null
      ? err.publicMessage
      : defaultMsg;
  const body = { error: errorOut, code };
  res.status(httpStatus).json(body);
});

const adminDist = path.join(__dirname, '..', 'admin', 'dist');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

async function seedDefaultUsers() {
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
    console.log('[nw/boot] seed: 편집장 teomok1 created');
  } else if (t1.role !== 'editor_in_chief') {
    await updateUserRoleById(t1.id, 'editor_in_chief');
    console.log('[nw/boot] seed: teomok1 role updated to editor_in_chief');
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
    console.log('[nw/boot] seed: 관리자 admin1 created');
  }
}

function shortErr(e) {
  return String(e && e.message ? e.message : e).slice(0, 300);
}

async function start() {
  try {
    console.log('[nw/boot] backend boot started');
    logSupabaseEnvStatus();

    /** Render에서 레거시 파일 모드 + 경로 미설정 시 process.exit(1) — 여기서는 로그만 */
    exitIfRenderMissingJsonPaths();

    try {
      assertSupabaseRequiredAtStartup();
      bootState.supabaseRequiredEnvOk = true;
      console.log('[nw/boot] supabase env check: OK (required for production DB)');
    } catch (e) {
      bootState.supabaseRequiredEnvOk = false;
      console.error('[nw/boot] supabase env check: FAILED —', shortErr(e));
      fatalStartupOneLine(`supabase env missing: ${shortErr(e)}`);
    }

    await new Promise((resolve, reject) => {
      const server = app.listen(PORT, () => {
        bootState.listenAt = new Date().toISOString();
        console.log(`[nw/boot] app.listen success port=${PORT}`);
        logPersistenceOnStartup();
        console.log(`Backend running at http://127.0.0.1:${PORT}`);
        resolve();
      });
      server.on('error', (err) => {
        fatalStartupOneLine(`listen failed: ${shortErr(err)}`);
        reject(err);
      });
    });

    console.log('[nw/boot] seed: start');
    try {
      await seedDefaultUsers();
      console.log('[nw/boot] seed: success');
    } catch (e) {
      console.error('[nw/boot] seed: failure —', shortErr(e));
      fatalStartupOneLine(`seed failed (non-fatal): ${shortErr(e)}`);
    }
  } catch (e) {
    console.error('[nw/boot] startup aborted:', e);
    fatalStartupOneLine(shortErr(e));
    throw e;
  }
}

start().catch((err) => {
  console.error('[nw/boot] unhandled startup rejection:', err);
  fatalStartupOneLine(`unhandled startup: ${shortErr(err)}`);
  process.exit(1);
});
