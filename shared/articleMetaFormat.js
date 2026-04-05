/**
 * 기사 메타 표시 단일 규칙 (원본 category/author_name/날짜 필드 비변경)
 * - admin 미리보기(articlePreview, articleForm 모달)
 * - 메인 script.js 는 동일 알고리즘으로 NW_CATEGORY_VALUE_TO_LABEL + 헬퍼 동기화
 * @see ./articleCategories.json
 */
import raw from './articleCategories.json';

function buildValueToLabelMap(data) {
  const m = new Map();
  for (const g of data.groups || []) {
    for (const it of g.items || []) {
      m.set(it.value, it.label);
    }
  }
  for (const it of data.topLevel || []) {
    m.set(it.value, it.label);
  }
  return m;
}

const valueToLabel = buildValueToLabelMap(raw);

/** 저장값(예: 경제-금융) → 짧은 표시명(예: 금융). JSON에 없으면 원문 */
export function categoryLabelForValue(value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return valueToLabel.get(v) || v;
}

export function reporterDisplayName(name) {
  const n = String(name || '').trim();
  if (!n) return '기자';
  if (/기자\s*$/.test(n)) return n;
  return n + ' 기자';
}

/** articlePreview 와 동일: YYYY-MM-DD */
export function formatArticleMetaDateYmd(raw) {
  if (!raw) return '—';
  const s = String(raw).replace(' ', 'T');
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10) || '—';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + mo + '-' + day;
}
