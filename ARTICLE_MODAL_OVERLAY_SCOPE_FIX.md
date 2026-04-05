# ARTICLE_MODAL_OVERLAY_SCOPE_FIX

## 목표

- 전역 fullscreen 모달 금지.
- 헤더 / 카테고리 네비 / 푸터는 **그대로 밝게** 유지.
- dim + 기사 카드는 **`main` 영역** 안에서만.

## 구현 요약

1. **HTML** (`index.html`, `public/index.html`)  
   - `#nwArticleModal` 블록을 `body` 끝에서 제거하고, **`</main>` 직전**으로 이동.

2. **CSS** (`styles.css`, `public/styles.css`)  
   - `.main`: `position: relative` — 오버레이 `absolute` 기준块.  
   - `.nw-article-modal`: `position: absolute; inset: 0; z-index: 40` — `fixed`·전역 `inset:0` 제거.  
   - 다이얼로그 `max-height`: `min(80vh, min(880px, 100%))` — **`main` 안에서 넘치지 않게**.  
   - `body.nw-article-modal-open main.main { overflow: hidden }` — 열린 동안 메인 in-flow 스크롤 억제(오버레이 밑 콘텐츠).  
   - 기존 `.nw-article-modal__article-scroll { overflow-y: auto }` 유지 → **본문만 스크롤**.

3. **script.js**  
   - 변경 없음(`#nwArticleModal` id 유지, ESC/백드롭/닫기 동일).

## 닫기 / 스크롤

- 닫기: 배경 클릭, ×, ESC — 유지.  
- `html/body` `overflow: hidden` — 문서 스크롤 잠금 유지(모달 열림 시).

## 스크린샷

- 요청 경로: `docs/screenshots/modal-scope-fixed.png`, `modal-content-centered.png`, `modal-header-visible.png`  
- 이 작업에서는 이미지 파일을 생성하지 않음 — 배포 후 브라우저에서 캡처 권장.
