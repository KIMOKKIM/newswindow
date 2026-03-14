import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function run() {
  const existing = db.prepare('SELECT * FROM users WHERE userid = ?').get('teomok1');
  if (existing) {
    console.log('Seed: admin teomok1 already exists');
    return;
  }
  const hash = await bcrypt.hash('teomok$123', 10);
  db.prepare(
    'INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)'
  ).run('teomok1', hash, '관리자', 'admin@newswindow.kr', 'admin');
  console.log('Seed: admin teomok1 created');
}
