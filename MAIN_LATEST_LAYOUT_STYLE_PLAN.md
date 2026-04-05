# 레이아웃·스타일 계획

## 수정 파일

- `index.html` — `#nwLatestTop5` 2열 구조만 교체
- `script.js` — `renderLatestTop5FromList`, `ensureNwLatestTop5Section`
- `styles.css` — `.nw-latest-*` 블록 (구 `.nw-top5-*` 제거)

## 그리드

- **데스크톱:** `grid-template-columns: minmax(0,1fr) minmax(260px, 35%)` → 좌 약 65%·우 약 35%
- **≤900px:** 1열 세로 스택 (히어로 위·리스트 아래)

## 히어로 이미지

- `.nw-latest-hero__media { aspect-ratio: 16/9; max-height: 360px; object-fit: cover }`

## 헤드라인 중복 방지

- Top5가 로드되면 `.headline-section`은 `display: none`
- 목록 비거나 오류 시 `.headline-section` 다시 표시 (정적 마크업)

## 광고

- 광고·fetch·adjust 로직 **미변경**
