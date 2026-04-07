import { useSupabasePersistence } from '../lib/dbMode.js';
import { db } from './db.js';
import * as usersSb from './users.supabase.js';

/**
 * 로그인·회원가입·사용자 API — Supabase 또는 레거시 db.js(JSON 파일)
 */
export async function getUserByUserid(userid) {
  if (useSupabasePersistence()) return usersSb.findByUserid(userid);
  return db.prepare('SELECT * FROM users WHERE userid = ?').get(userid);
}

export async function getUserById(id) {
  if (useSupabasePersistence()) return usersSb.findById(id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export async function userIdExists(userid) {
  if (useSupabasePersistence()) {
    const row = await usersSb.findIdByUserid(userid);
    return Boolean(row);
  }
  return Boolean(db.prepare('SELECT id FROM users WHERE userid = ?').get(userid));
}

export async function createUser({ userid, password_hash, name, email, role, ssn, phone, address }) {
  if (useSupabasePersistence()) {
    return usersSb.insertUser({ userid, password_hash, name, email, role, ssn, phone, address });
  }
  db.prepare(
    'INSERT INTO users (userid, password_hash, name, email, role, ssn, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(userid, password_hash, name, email, role, ssn || '', phone || '', address || '');
  return getUserByUserid(userid);
}

export async function updateUserRoleById(id, role) {
  if (useSupabasePersistence()) return usersSb.updateRoleById(id, role);
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, Number(id));
}

export async function updateUserProfile(id, updates) {
  if (useSupabasePersistence()) {
    return usersSb.updateProfileById(id, updates);
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return;
  db.prepare(
    'UPDATE users SET name = ?, email = ?, ssn = ?, phone = ?, address = ?, password_hash = ? WHERE id = ?'
  ).run(
    updates.name !== undefined ? updates.name : row.name,
    updates.email !== undefined ? updates.email : row.email,
    updates.ssn !== undefined ? updates.ssn : row.ssn || '',
    updates.phone !== undefined ? updates.phone : row.phone || '',
    updates.address !== undefined ? updates.address : row.address || '',
    updates.password_hash !== undefined ? updates.password_hash : row.password_hash,
    id
  );
}

export async function listUsers(staffRole) {
  if (useSupabasePersistence()) {
    if (staffRole === 'admin') return usersSb.listUsersForRole(null);
    if (staffRole === 'editor_in_chief') return usersSb.listUsersForRole('reporter');
    return [];
  }
  if (staffRole === 'admin') {
    return db
      .prepare('SELECT id, userid, name, email, role, created_at FROM users ORDER BY created_at DESC')
      .all();
  }
  if (staffRole === 'editor_in_chief') {
    return db
      .prepare('SELECT id, userid, name, email, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC')
      .all('reporter');
  }
  return [];
}
