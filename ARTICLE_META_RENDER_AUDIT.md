# ARTICLE_META_RENDER_AUDIT

## 메타 줄 출력 위치

- **함수**: `nwBuildArticleDetailHtml(a)` (`script.js`)
- **필드**: `a.category`, `a.author_name` — API `GET /api/articles/public/:id` JSON 그대로 읽고, **표시 직전에만** `formatCategoryLabel` / `formatAuthorLabel` 적용.
- **형식**: `카테고리 | 기자명 | 발행 … · 수정 …` 한 줄 (`nw-article-detail__meta`).

## 모달 여부

- 현재 메인은 **인라인 패널 `#nwArticleDetail`** 만 사용한다. 별도 모달용 `nwModalBuildArticleHtml`은 없음 → **상세 메타는 이 함수 한 곳**에서만 조립된다.

## 목록/히어로·헤드라인

- 동일 규칙은 **`displayCategory`** 로 통합 적용: `renderLatestTop5FromList`(히어로·리스트 메타), `renderHeadlineFromPublished`.
