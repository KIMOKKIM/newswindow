(async ()=> {
  const users = [
    { userid: 'teomok1', password: 'teomok$123' },
    { userid: 'teomok2', password: 'teomok$123' },
    { userid: 'admin1', password: 'teomok$123' }
  ];
  for (const u of users) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(u)
      });
      const txt = await res.text();
      console.log(u.userid, res.status, txt);
    } catch (e) {
      console.error('error for', u.userid, e && e.message);
    }
  }
  process.exit(0);
})();

