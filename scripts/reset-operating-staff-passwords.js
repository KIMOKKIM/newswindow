const bcrypt = require(require('path').join(__dirname, '..', 'backend', 'node_modules', 'bcryptjs'));
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'backend', 'data', 'users.json');
const users = JSON.parse(fs.readFileSync(p, 'utf8'));
const map = {
  teomok1: 'teomok$123',
  teomok2: 'kim$8800811',
  admin1: 'teomok$123',
};
for (const u of users) {
  if (map[u.userid]) {
    u.password_hash = bcrypt.hashSync(map[u.userid], 10);
    console.log('updated', u.userid);
  }
}
fs.writeFileSync(p, JSON.stringify(users, null, 2));
