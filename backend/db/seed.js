import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function run() {
  const existing = db.prepare('SELECT * FROM users WHERE userid = ?').get('teomok1');
  if (existing) {
    db.prepare('UPDATE users SET role = ? WHERE userid = ?').run('editor_in_chief', 'teomok1');
    console.log('Seed: teomok1 role updated to editor_in_chief');
    return;
  }
  const hash = await bcrypt.hash('teomok$123', 10);
  db.prepare(
    'INSERT INTO users (userid, password_hash, name, email, role) VALUES (?, ?, ?, ?, ?)'
  ).run('teomok1', hash, '편집장', 'editor@newswindow.kr', 'editor_in_chief');
  console.log('Seed: 편집장 teomok1 created');
}
