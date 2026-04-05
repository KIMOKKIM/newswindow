# ARTICLE_DETAIL_RENDER_FIX

## 구현

- **API**: `ARTICLES_API + '/api/articles/public/' + encodeURIComponent(id)` (`cache: 'no-store'`).
- **성공**: `nwBuildArticleDetailHtml(a)` — 제목(`h1#nwArticleDetailTitle`), 부제, 메타(카테고리·기자·발행·수정), `image1`–`4`·캡션·`content1`–`4`·레거시 `content`, 법적 문구.
- **로딩/오류**: `.nw-article-detail__inner--plain` + 패널 내부만 메시지.

## 제거

- 전역 오버레이 모달 `#nwArticleModal` / `nw-article-modal` 스타일 제거.
- `body.nw-article-modal-open` 스크롤 잠금 제거.

## 정적 동기화

- `public/index.html`, `public/script.js`, `public/styles.css` = 루트와 동일 경로 (`vercel-build` 복사 전제).
