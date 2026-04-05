# 메인 기사 링크 동작 통일

## 통일 규칙 ( `body.nw-home` )

| 영역 | 생성 함수 | 클래스·속성 | 클릭 시 |
|------|-----------|-------------|---------|
| 최신기사 히어로 | `renderLatestTop5FromList` | `public-article-link`, `data-public-article-id` | 모달 |
| 최신기사 우측 리스트 | 동일 | 동일 | 모달 |
| 헤드라인 메인/사이드 | `renderHeadlineFromPublished` | `publicArticleAnchorAttrs` | 모달 |
| 카테고리 섹션 리스트 | `renderSectionListsByCategory` | 동일 | 모달 |
| 포토뉴스&영상 | `renderTvSectionByCategory` | 동일 | 모달 |

## `href`

- `publicArticleHref(id)` → **`#`** (페이지 전환 없음). 식별은 **`data-public-article-id`** 만 사용.

## 제외

- 사이드바 정적 마크업(`이슈포커스` 등)은 API로 치환하지 않는 한 `public-article-link`가 없음 — 이번 변경 범위 밖.
- `nw-office` / `admin` / `all-articles.html` — 미수정(요구사항).

## 중복 쿼리

- 과거 `article.html?id=#id=` 패턴 제거 후 **이중 `?id=` 생성 없음**.
