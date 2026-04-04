/** 기사 폼 카테고리 (기존 nw-office와 동일 계열) */
export const CATEGORY_OPTIONS = [
  { value: '', label: '선택하세요' },
  { value: '정치-최신뉴스', label: '정치-최신뉴스' },
  { value: '정치-지방자치', label: '정치-지방자치' },
  { value: '경제-금융', label: '경제-금융' },
  { value: '경제-AI/IT', label: '경제-AI/IT' },
  { value: '사회-시사', label: '사회-시사' },
  { value: '문화-대중음악', label: '문화-대중음악' },
  { value: '전국-서울', label: '전국-서울' },
  { value: '이슈-연예&스포츠', label: '이슈-연예&스포츠' },
  { value: '국제', label: '국제' },
  { value: '칼럼', label: '칼럼' },
  { value: '포토뉴스&영상', label: '포토뉴스&영상' },
];

export function categorySelectHtml(selected) {
  return CATEGORY_OPTIONS.map(
    (o) =>
      `<option value="${escapeAttr(o.value)}"${o.value === selected ? ' selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('');
}

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
