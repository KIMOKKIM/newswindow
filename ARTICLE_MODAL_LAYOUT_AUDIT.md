> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# ARTICLE_MODAL_LAYOUT_AUDIT — 메인 기사 모달 레이아웃 점검

## 모달을 여는 코드 경로

- **진입점**: `a.public-article-link` 클릭 (캡처 단계 `capture: true`).
- **함수**: `nwBindMainArticleModal()` → `nwOpenArticleModal(articleId)` (`script.js`).
- **데이터**: `GET ${ARTICLES_API}/api/articles/public/:id` (`fetch`, `cache: 'no-store'`).

## 모달 DOM 위치

- **`index.html`**: `</div><!-- /.page-wrapper -->` **직후**, `body` 닫기 직전.
- **구조**: `#nwArticleModal` → 배경 `.nw-article-modal__backdrop` → `.nw-article-modal__dialog` → `.nw-article-modal__dialog-inner` → 닫기 버튼 + `#nwArticleModalBody`.

## 기존(개선 전) 문제 요약

- 모바일 우선 스타일이 **`align-items: flex-end`** 로 하단 시트에 가깝게 동작했고, 데스크톱에서만 중앙 정렬로 보정되는 **이중 규칙**이었다.
- **스크롤이 `.nw-article-modal__body` 전체**에 걸려 제목·메타와 본문이 함께 스크롤되거나, 긴 기사에서 사용감이 일관되지 않을 수 있었다.
- `z-index: 10050` 고정 오버레이가 **전체 뷰포트**를 덮으므로, 헤더/네비/푸터는 DOM상으로는 그대로이나 **시각적으로는 모두 dim** 된다. “고정”은 **페이지 스크롤 잠금(`overflow: hidden`) + 기존 sticky 레이아웃이 스크롤되지 않아 위치가 유지되는 효과**에 가깝다.

## 스크롤·overflow 처리

- **모달 열림**: `body`·`html`에 클래스 `nw-article-modal-open` → `overflow: hidden`, `overscroll-behavior: none` (`styles.css`).
- **모달 내부**: 성공 시 `#nwArticleModalBody`는 flex 컬럼; **`.nw-article-modal__article-scroll`만 `overflow-y: auto`**. 제목/메타는 `.nw-article-modal__masthead`에 고정(스크롤 영역 밖).
- **로딩/오류**: `#nwArticleModalBody`에 `nw-article-modal__body--plain`을 같이 써 단일 열 스크롤·패딩 유지.

## 닫기

- 배경 클릭, 닫기 버튼, **ESC** (`nwArticleModalOnKeydown`).

## 운영 사이트와의 차이 (2026-04-01 기준 HTTP 확인)

- `https://www.newswindow.kr/` HTML에는 아직 **`nw-article-modal__dialog-inner` 없음** (구 마크업). 본 저장소 반영 후 **재배포** 시 프로덕션과 동기화된다.
