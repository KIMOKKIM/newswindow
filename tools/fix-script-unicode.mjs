import fs from 'fs';
import { fileURLToPath } from 'url';

const p = fileURLToPath(new URL('../script.js', import.meta.url));
let s = fs.readFileSync(p, 'utf8');
const bad = "htLoad.textContent = '";
const i = s.indexOf(bad, s.indexOf('htLoad = document.getElementById'));
if (i < 0) throw new Error('bad line');
const end = s.indexOf("';", i);
const line = s.slice(i, end + 2);
const good =
  "htLoad.textContent = '\\ucd5c\\uc2e0 \\uae30\\uc0ac\\ub97c \\ubd88\\ub7ec\\uc624\\ub294 \\uc911\\u2026';";
if (!line.includes('htLoad.textContent')) throw new Error('line');
s = s.slice(0, i) + good + s.slice(end + 2);
fs.writeFileSync(p, s);
console.log('fixed hero loading text');
