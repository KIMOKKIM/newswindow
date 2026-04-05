# 기사 상세 링크 규칙

## 사용 함수

- `publicArticleHref(id)` → `/article.html?id=<encodeURIComponent(id)>#id=<same>`
- `publicArticleAnchorAttrs(id)` 대신 히어로/리스트에서 동일 `href` + `data-public-article-id`

## 검증

- 좌측 히어로: `#nwLatestHeroLink` — `show(i)`마다 갱신
- 우측: 각 `a.nw-latest-list__link`

## 금지

- 임의 도메인 하드코딩 없음
- `#`만 있는 기사 링크 없음 (항상 `article.html?id=…`)
