import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { db } from './db/db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:8080';

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

async function start() {
  const adminExists = db.prepare('SELECT * FROM users WHERE userid = ?').get('teomok1');
  if (!adminExists) {
    const hash = await bcrypt.hash('teomok$123', 10);
    db.prepare('INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)')
      .run('teomok1', hash, '관리자', 'admin@newswindow.kr', 'admin');
    console.log('Seed: admin teomok1 created');
  }
  app.listen(PORT, () => {
    console.log(`Backend running at http://127.0.0.1:${PORT}`);
  });
}
start();
