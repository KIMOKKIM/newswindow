import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cache = null;

function loadSpec() {
  if (cache) return cache;
  const jsonPath = path.join(__dirname, '../../shared/articleCategories.json');
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const j = JSON.parse(raw);
  const majorTitles = new Set();
  const fullValues = new Set();
  for (const g of j.groups || []) {
    if (g.title) majorTitles.add(String(g.title).trim());
    for (const it of g.items || []) {
      if (it && it.value != null) fullValues.add(String(it.value).trim());
    }
  }
  const exactTop = new Set();
  for (const t of j.topLevel || []) {
    if (t && t.value != null) {
      const v = String(t.value).trim();
      exactTop.add(v);
      fullValues.add(v);
    }
  }
  for (const t of j.editorOnlyTopLevel || []) {
    if (t && t.value != null) {
      const v = String(t.value).trim();
      exactTop.add(v);
      fullValues.add(v);
    }
  }
  cache = { majorTitles, fullValues, exactTop };
  return cache;
}

/**
 * 공개 목록·섹션: DB category 문자열이 섹션 파라미터와 맞는지.
 * @param {string} dbCategory articles.category
 * @param {string} sectionParam 쿼리 category (디코드된 값)
 */
export function articleMatchesSectionCategory(dbCategory, sectionParam) {
  const c = String(dbCategory || '').trim();
  const s = String(sectionParam || '').trim();
  if (!s) return true;
  const { majorTitles, fullValues, exactTop } = loadSpec();
  if (fullValues.has(s)) return c === s;
  if (exactTop.has(s)) return c === s;
  if (majorTitles.has(s)) return c === s || c.startsWith(s + '-');
  return false;
}

export function isKnownSectionCategoryParam(sectionParam) {
  const s = String(sectionParam || '').trim();
  if (!s) return false;
  const { majorTitles, fullValues, exactTop } = loadSpec();
  return majorTitles.has(s) || fullValues.has(s) || exactTop.has(s);
}
