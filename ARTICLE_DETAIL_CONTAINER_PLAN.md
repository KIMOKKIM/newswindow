# ARTICLE_DETAIL_CONTAINER_PLAN

## 단일 컨테이너

- **요소**: `#nwArticleDetail` (`section.nw-article-detail`), 위치: **`#nwLatestTop5` 바로 다음**, `#headline-section` 앞 (`index.html`).
- **본문 주입**: `#nwArticleDetailBody` (`.nw-article-detail__inner`).

## 회색 영역과의 관계

- 히어로 좌측 **회색 박스**는 `.nw-latest-hero__media` 플레이스홀더·썸네일용 — **상세 본문 컨테이너가 아님.**
- 실제 상세(제목·메타·이미지·본문)는 **전용 패널 `#nwArticleDetail`** 에만 렌더 → 롤링 DOM과 혼동 없음.

## active vs 상세

- **UI active**: `show(i)` → `nwLatestTop5Sync.goTo(i)` (클릭한 기사가 Top5에 있을 때만).
- **데이터 상세**: `nwOpenArticleDetail` → `GET /api/articles/public/:id` → `nwBuildArticleDetailHtml`.
