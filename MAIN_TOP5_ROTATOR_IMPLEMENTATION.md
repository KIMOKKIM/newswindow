# 최신기사 5개 롤링 UI 구현 요약

## 마크업

- 파일: `index.html`
- `<main class="main container">` 직후, `.headline-section` 앞에 `#nwTop5Rotator` 블록 추가.
- 구조: 썸네일 `#nwTop5Thumb`, 제목 `#nwTop5Title`, 한 줄 메타 `#nwTop5Meta`, 링크 `#nwTop5Link`, 인디케이터 `#nwTop5Dots`.

## 스크립트

- 파일: `script.js`
- `renderTop5RotatorFromList(articles)`:
  - `sortByLatest(articles).slice(0, 5)`로 상위 5개 확정.
  - `setInterval(..., 3000)`으로 인덱스 순환(2개 이상일 때만).
  - 썸네일: `resolveArticleListThumb`로 `/uploads` 상대경로를 `NW_PUBLIC_UPLOAD_ORIGIN` 등에 접합.
- `/api/articles/public/list` 성공 콜백에서 **헤드라인 렌더 전에** 롤링 함수 호출; 빈 배열·에러 시 롤링 숨김.

## 스타일

- 파일: `styles.css`
- 클래스: `.nw-top5-rotator`, `.nw-top5-link`(flex), `.nw-top5-thumb-wrap`, `.nw-top5-title`, `.nw-top5-dots`, `.nw-top5-dot.is-active`, 모바일 세로 스택.

## 접근성

- 섹션 `aria-label="최신 기사"`, 롤링 영역 `aria-live="polite"`(섹션에 부여됨).
