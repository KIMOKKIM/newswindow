/**
 * 메인 페이지(index.html) 주메뉴·섹션 하위 분류와 동일한 목록.
 * 원본: ../../../shared/articleCategories.json (단일 source of truth)
 */
import raw from '../../../shared/articleCategories.json';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function buildCategoryOptions() {
  const out = [{ value: '', label: '선택하세요' }];
  for (const g of raw.groups || []) {
    for (const it of g.items || []) {
      out.push({ value: it.value, label: it.label });
    }
  }
  for (const it of raw.topLevel || []) {
    out.push({ value: it.value, label: it.label });
  }
  for (const it of raw.editorOnlyTopLevel || []) {
    out.push({ value: it.value, label: it.label });
  }
  return out;
}

/** 카테고리 표시명 — shared/articleMetaFormat.js 단일 규칙 */
export { categoryLabelForValue } from '../../../shared/articleMetaFormat.js';

/** 평탄 목록 (다른 모듈에서 참조 시 JSON과 동일 순서) */
export const CATEGORY_OPTIONS = buildCategoryOptions();

/** 기사 폼 `<select>` — 메인과 같은 그룹 구조(optgroup) */
export function categorySelectHtml(selected) {
  let html =
    '<option value="">' + escapeHtml('선택하세요') + '</option>';
  for (const g of raw.groups || []) {
    html += '<optgroup label="' + escapeAttr(g.title) + '">';
    for (const it of g.items || []) {
      const sel = it.value === selected ? ' selected' : '';
      html +=
        '<option value="' +
        escapeAttr(it.value) +
        '"' +
        sel +
        '>' +
        escapeHtml(it.label) +
        '</option>';
    }
    html += '</optgroup>';
  }
  for (const it of raw.topLevel || []) {
    const sel = it.value === selected ? ' selected' : '';
    html +=
      '<option value="' +
      escapeAttr(it.value) +
      '"' +
      sel +
      '>' +
      escapeHtml(it.label) +
      '</option>';
  }
  if ((raw.editorOnlyTopLevel || []).length) {
    html += '<optgroup label="' + escapeAttr('기타(헤더 비노출)') + '">';
    for (const it of raw.editorOnlyTopLevel || []) {
      const sel = it.value === selected ? ' selected' : '';
      html +=
        '<option value="' +
        escapeAttr(it.value) +
        '"' +
        sel +
        '>' +
        escapeHtml(it.label) +
        '</option>';
    }
    html += '</optgroup>';
  }
  return html;
}
