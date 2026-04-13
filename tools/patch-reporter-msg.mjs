import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'admin', 'src', 'pages', 'reporterSignup.js');
let s = fs.readFileSync(p, 'utf8');
const re = /msg\.textContent = \(data && data\.error\) \|\| '[^']*';/;
if (!re.test(s)) {
  console.error('pattern not found');
  process.exit(1);
}
s = s.replace(re, 'msg.textContent = userFacingAuthErrorMessage(data, null);');
fs.writeFileSync(p, s);
console.log('ok');
