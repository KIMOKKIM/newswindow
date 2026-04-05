# 우측 최신기사 리스트

## 구현

- **파일:** `script.js` — `renderLatestTop5FromList`에서 `#nwLatestList`에 `li.nw-latest-list__item` 동적 생성
- **내용:** 제목(`a.nw-latest-list__link`) + 한 줄 메타(카테고리 · 날짜)
- **데이터:** 좌측 히어로와 **동일 `top5` 배열** (같은 `sortByLatest`·`slice(0,5)`).
- **활성:** `show(i)`마다 `li.is-active` 토글 (히어로 인덱스와 동기).
- **이동:** 각 링크 `href` = `publicArticleHref(id)`, 기존 기사 상세 규칙과 동일.
- **말줄임:** `styles.css` `-webkit-line-clamp: 2` on `.nw-latest-list__link`.
