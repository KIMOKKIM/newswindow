# 초기 레이아웃 고정 (개선 후)

## 변경 요약

- `index.html`: `#nwLatestTop5` 를 **처음부터 표시** (`display:none` 제거), `nw-latest-top5--loading` 으로 로딩 상태만 표시.
- `styles.css`: `body:has(#nwLatestTop5) .headline-section { display: none !important; }` 로 **F5 직후부터** 레거시 헤드라인 샘플 비노출.
- `script.js`:
  - `ensureNwLatestTop5Section` **DOM 삽입 제거** — `getNwLatestTop5Section()` 만 사용, **데이터 바인딩만** 수행.
  - 빈 목록·fetch 실패 시에도 섹션을 숨기지 않고 **2열 골격 유지** + 안내 문구(`setLatestTop5EmptyState`).

## 결과

- 첫 페인트부터 최종 2열 레이아웃 골격이 보이고, 예전 헤드라인 블록은 표시되지 않음.
- 데이터 전에는 “불러오는 중…” 및 로딩 시각 효과만 추가.
