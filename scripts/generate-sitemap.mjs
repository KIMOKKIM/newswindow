/**
 * Writes public/sitemap.xml — hub URLs + section categories + optional article URLs from API.
 * Env: NW_SITEMAP_API_ORIGIN (e.g. https://newswindow-backend.onrender.com) to include /api/articles/public/sitemap-entries
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicDir = join(root, 'public');
const site = 'https://www.newswindow.kr';

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEl(loc, lastmod) {
  let x = '  <url><loc>' + xmlEscape(loc) + '</loc>';
  if (lastmod) x += '<lastmod>' + xmlEscape(lastmod) + '</lastmod>';
  x += '</url>\n';
  return x;
}

async function main() {
  mkdirSync(publicDir, { recursive: true });
  const catPath = join(root, 'shared/articleCategories.json');
  const spec = JSON.parse(readFileSync(catPath, 'utf8'));
  const urls = [];
  urls.push({ loc: site + '/' });
  urls.push({ loc: site + '/index.html' });
  urls.push({ loc: site + '/all-articles.html' });
  urls.push({ loc: site + '/article.html' });
  urls.push({ loc: site + '/author.html' });
  urls.push({ loc: site + '/info.html?page=company' });
  for (const g of spec.groups || []) {
    for (const it of g.items || []) {
      if (it.value) urls.push({ loc: site + '/section.html?category=' + encodeURIComponent(it.value) });
    }
  }
  for (const t of spec.topLevel || []) {
    if (t.value) urls.push({ loc: site + '/section.html?category=' + encodeURIComponent(t.value) });
  }

  const api =
    String(process.env.NW_SITEMAP_API_ORIGIN || process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '') ||
    'http://127.0.0.1:3000';
  try {
    const r = await fetch(api + '/api/articles/public/sitemap-entries');
    if (r.ok) {
      const j = await r.json();
      const articles = j.articles || [];
      for (const a of articles) {
        if (a.id == null) continue;
        urls.push({
          loc: site + '/article.html?id=' + encodeURIComponent(String(a.id)),
          lastmod: a.lastmod || '',
        });
      }
    }
  } catch {
    /* static-only sitemap */
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) xml += urlEl(u.loc, u.lastmod);
  xml += '</urlset>\n';
  writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8');
  console.log('generate-sitemap: wrote', urls.length, 'URLs to public/sitemap.xml');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
