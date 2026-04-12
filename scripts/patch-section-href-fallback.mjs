/**
 * data-nw-section links: set static href matching buildSectionHref (works without JS).
 */
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function buildSectionHref(category) {
  const c = String(category == null ? '' : category).trim();
  if (!c) return 'section.html';
  return 'section.html?category=' + encodeURIComponent(c);
}

function patch(html) {
  return html.replace(
    /<a href="#" (data-nw-section="([^"]+)")([^>]*)>/g,
    (m, attr, cat, rest) => `<a href="${buildSectionHref(cat)}" ${attr}${rest}>`
  );
}

for (const f of ['index.html', 'all-articles.html', 'section.html']) {
  const p = path.join(root, f);
  let s = fs.readFileSync(p, 'utf8');
  const before = (s.match(/<a href="#" data-nw-section=/g) || []).length;
  s = patch(s);
  const after = (s.match(/<a href="#" data-nw-section=/g) || []).length;
  fs.writeFileSync(p, s);
  console.log(f, 'replaced', before - after, 'links; leftover #:', after);
}
