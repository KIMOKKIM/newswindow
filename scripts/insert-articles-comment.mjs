import fs from 'fs';

const p = new URL('../backend/routes/articles.js', import.meta.url);
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const ix = lines.findIndex((x) => x.includes('GET /api/articles/public/latest'));
if (ix < 0) throw new Error('marker not found');
lines.splice(
  ix + 1,
  0,
  '// Main page: 4s client timeout; check X-NW-Public-Latest-Timing-Ms and slow logs when diagnosing.',
);
fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('inserted comment at', ix + 1);
