const fs = require('fs');
const path = require('path');
const bcrypt = require('./backend/node_modules/bcryptjs');

const DB_PATH = path.join(__dirname, 'backend', 'data', 'users.json');

const resets = {
  teomok1: 'teomok$123',
  teomok2: 'kim$8800811',
  admin1:  'teomok$123'
};

function load() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('users.json not found at', DB_PATH);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function run() {
  const users = load();
  let changed = 0;
  for (const u of users) {
    if (resets[u.userid]) {
      const pw = resets[u.userid];
      const hash = bcrypt.hashSync(pw, 10);
      if (u.password_hash !== hash) {
        u.password_hash = hash;
        changed++;
        console.log(`updated ${u.userid}`);
      } else {
        console.log(`nochange ${u.userid}`);
      }
    }
  }
  if (changed) {
    save(users);
    console.log(`saved ${changed} updated users to ${DB_PATH}`);
  } else {
    console.log('no updates necessary');
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });

