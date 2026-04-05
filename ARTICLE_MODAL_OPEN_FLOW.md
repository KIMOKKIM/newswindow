# 메인 기사 모달 오픈 플로우

## 전제

- `index.html`의 `<body class="nw-home">` 일 때만 동작(`nwIsHomeModalPage()`).

## 트리거

- 캡처 단계 `document` 클릭: `a.public-article-link` 이고 `data-public-article-id`가 있으면 `preventDefault()` 후 `nwOpenArticleModal(id)`.
- 적용 링크 생성: `publicArticleAnchorAttrs` / `renderLatestTop5FromList` / `renderHeadlineFromPublished` / `renderSectionListsByCategory` / `renderTvSectionByCategory` (모두 `script.js`).

## 데이터 로드

- `fetch(ARTICLES_API + '/api/articles/public/' + encodeURIComponent(id), { cache: 'no-store' })`
- 메인 목록과 **동일한 `ARTICLES_API`** 규칙(운영에서 Render 오리진).

## 성공/실패 UI

- 성공: `#nwArticleModalBody`에 HTML 채움(제목·메타·본문·이미지·법적 문구).
- 실패: 모달 내부에 에러 제목 + 메시지(페이지 이동 없음).

## 닫기

- 닫기 버튼, 백드롭 클릭, `Escape`.
- `body`/`html`에서 `nw-article-modal-open` 제거, `overflow` 복구.

## `article.html`

- 메인에서의 기본 클릭은 **`href="#"`** 로 두고 스크립트로만 모달을 연다(전체 페이지 이동 없음).
