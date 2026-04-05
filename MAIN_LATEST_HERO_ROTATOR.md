# 좌측 히어로 롤링

## 구현

- **파일:** `script.js` — `renderLatestTop5FromList` 내부
- **마크업:** `index.html` `#nwLatestTop5` / `#nwLatestHeroLink` / `#nwLatestHeroImg` / `#nwLatestHeroTitle` / `#nwLatestHeroMeta` / `#nwLatestHeroDots`
- **동작:** `show(i)`가 제목·메타·썸네일·링크·dots·리스트 `is-active`를 한 번에 갱신.
- **주기:** `top5.length > 1`일 때만 `setInterval(..., 3000)`; 재진입 시 `clearInterval(nwLatestTop5Timer)`.
- **썸네일:** `resolveArticleListThumb(row.thumb)` — 없으면 `#nwLatestHeroMedia`에 `is-placeholder` (CSS 안내 문구).
- **링크:** `publicArticleHref(row.id)` + `data-public-article-id` (`public-article-link`).
- **첫 표시:** `show(0)`.

## 폴백

- 이미지 로드 실패 시 `onerror`로 placeholder 전환.
