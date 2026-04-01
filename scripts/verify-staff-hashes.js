const path = require('path');
const bcrypt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'bcryptjs'));
const fs = require('fs');
const usersPath = path.join(__dirname, '..', 'backend', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const checks = [
  ['teomok1', 'teomok$123'],
  ['teomok2', 'kim$8800811'],
  ['admin1', 'teomok$123'],
];
for (const [uid, pw] of checks) {
  const u = users.find((x) => x.userid === uid);
  if (!u) {
    console.log(uid, 'MISSING_USER');
    continue;
  }
  console.log(uid, 'bcrypt_ok=', bcrypt.compareSync(pw, u.password_hash), 'role=', u.role);
}
