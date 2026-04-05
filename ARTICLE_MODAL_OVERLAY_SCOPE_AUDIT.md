# ARTICLE_MODAL_OVERLAY_SCOPE_AUDIT

## 변경 전(운영에 남아 있던 패턴)

| 항목 | 사실 |
|------|------|
| Overlay DOM 위치 | `body` 직하위, `</div><!-- .page-wrapper -->` **다음** — `header` / `nav` / `footer`와 **형제** |
| Overlay CSS | `position: fixed; inset: 0` → **뷰포트 전체** |
| Dim 범위 | 배경 `absolute; inset: 0` 이 모달 루트와 동일 → **헤더·카테고리 바·푸터까지 시각적으로 dim** |
| 헤더 등이 modal wrapper 안 포함? | **아니오** — DOM에 포함되지 않았으나, **전역 fixed 레이어**가 위에서 덮어 그려짐 |
| 중앙 정렬 기준 | **viewport** (`flex` + `fixed` 컨테이너) |

## 직접 원인(요구사항 미충족)

`#nwArticleModal`이 **문서 루트 고정층(`fixed` + `inset: 0`)** 이라, 레이아웃상 형제인 헤더/네비/푸터는 그 아래 깔리면서 **동일하게 반투명 배경에 가려진 것처럼** 보였다.

## 변경 후(저장소 기준)

| 항목 | 사실 |
|------|------|
| Overlay DOM 위치 | `<main class="main container">` **내부 마지막** 자식 |
| Overlay CSS | `position: absolute; inset: 0` — 포함 블록 = **`main` 패딩 박스** |
| Dim 범위 | `main` 안의 기사 영역(히어로·그리드·컬럼)만 |
| 헤더·로고·`header.nav-bar`(카테고리)·푸터 | `main` **밖**(`page-center` 상·하단) → **dim 레이어 비적용** |
| 중앙 정렬 기준 | **메인 콘텐츠 컬럼**(`main`의 너비·높이) |
