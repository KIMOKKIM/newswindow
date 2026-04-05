# ARTICLE_MODAL_CENTER_LAYOUT_SPEC — 중앙 모달 목표 레이아웃

## 표시 규칙

| 영역 | 동작 |
|------|------|
| 헤더(상단바+로고+네비) | 페이지 구조 유지. 모달 열릴 때 **본문 스크롤만 차단**해 sticky 영역이 움직이지 않으면 “고정”과 동일한 체감. |
| 카테고리/네비 | `header.nav-bar` 포함 동일. |
| 푸터·푸터 광고대 | 동일. |
| 모달 | `position: fixed; inset: 0` 컨테이너 안에서 **flex 중앙 정렬**. |
| 배경 | `.nw-article-modal__backdrop` 반투명 `rgba(0,0,0,0.5)` — **전체 뷰포트** dim (헤더/푸터도 어둡게 보임). 레이아웃은 제거하지 않음. |
| 본문 스크롤 | **`.nw-article-modal__article-scroll`만** 세로 스크롤. |

## 치수·반응형

- 모달 **최대 너비**: `900px`, `width: 100%`.
- 모달 **최대 높이**: `min(80vh, 880px)`; 매우 낮은 뷰포트는 `max-height: min(92vh, 640px)` 보조.
- 안전 영역: `padding`에 `env(safe-area-inset-*)` 반영.
- 좁은 화면: 좌우 `16px` 패딩으로 중앙에서 잘리지 않게 함.

## 상호작용

- 닫기: 배경 클릭, × 버튼, ESC.
- (선택 과제) 포커스 트랩/오픈 시 닫기 버튼 포커스는 미구현.

## API

- 더미 데이터 없음; 상세는 공개 API JSON 그대로 `nwModalBuildArticleHtml`에 주입.
