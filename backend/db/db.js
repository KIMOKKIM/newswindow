import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'users.json');

let users = [];
if (fs.existsSync(dbPath)) {
  try {
    users = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {}
}
if (!Array.isArray(users)) users = [];

function save() {
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2), 'utf8');
}

export const db = {
  prepare(sql) {
    return {
      get(...args) {
        if (sql.includes('WHERE userid = ?')) {
          const u = users.find(x => x.userid === args[0]);
          return u ? { ...u } : undefined;
        }
        if (sql.includes('WHERE id = ?')) {
          const u = users.find(x => x.id === Number(args[0]));
          return u ? { ...u } : undefined;
        }
        if (sql.includes('SELECT id FROM users')) {
          const u = users.find(x => x.userid === args[0]);
          return u ? { id: u.id } : undefined;
        }
        return undefined;
      },
      run(...args) {
        if (sql.includes('INSERT INTO users')) {
          const [userid, password_hash, name, email, role, ssn, phone, address] = args;
          const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
          const rec = { id, userid, password_hash, name, email, role, created_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
          if (args.length >= 8) {
            rec.ssn = ssn || '';
            rec.phone = phone || '';
            rec.address = address || '';
          }
          users.push(rec);
          save();
        }
        if (sql.includes('UPDATE users SET role = ?') && sql.includes('WHERE userid = ?')) {
          const [role, userid] = args;
          const u = users.find(x => x.userid === userid);
          if (u) { u.role = role; save(); }
        } else if (sql.includes('UPDATE users SET role = ?')) {
          const [role, id] = args;
          const u = users.find(x => x.id === Number(id));
          if (u) { u.role = role; save(); }
        }
        if (sql.includes('UPDATE users SET') && sql.includes('WHERE id = ?')) {
          const u = users.find(x => x.id === Number(args[args.length - 1]));
          if (u) {
            const updates = args.slice(0, -1);
            if (updates[0] !== undefined) u.name = updates[0];
            if (updates[1] !== undefined) u.email = updates[1];
            if (updates[2] !== undefined) u.ssn = updates[2];
            if (updates[3] !== undefined) u.phone = updates[3];
            if (updates[4] !== undefined) u.address = updates[4];
            if (updates[5] !== undefined) u.password_hash = updates[5];
            save();
          }
        }
      },
      all(...args) {
        if (sql.includes('WHERE role = ?')) {
          return users.filter(u => u.role === args[0]).reverse().map(u => ({
            id: u.id, userid: u.userid, name: u.name, email: u.email, role: u.role, created_at: u.created_at, ssn: u.ssn || '', phone: u.phone || '', address: u.address || ''
          }));
        }
        return [...users].reverse().map(u => ({
          id: u.id, userid: u.userid, name: u.name, email: u.email, role: u.role, created_at: u.created_at, ssn: u.ssn || '', phone: u.phone || '', address: u.address || ''
        }));
      }
    };
  }
};
