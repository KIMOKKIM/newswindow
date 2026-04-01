# 기자 대시보드 목록 → 수정 화면 404 원인 및 조치

## 원인 (확정)

- 목록의 제목 링크가 **`/nw-office/article-write?id=…`** (확장자 없음) 로 생성됨.
- 정적 호스팅(Vercel)에는 실제 파일 **`nw-office/article-write.html`** 만 존재하므로, 확장자 없는 URL은 **`404 NOT_FOUND`** (플랫폼 정적 파일 404).
- API·DB·JWT 문제가 아니라 **프론트 링크 경로 오타**에 가깝다.
- 상단 「기사작성」버튼은 상대경로 **`article-write.html`** 를 써서 정상 동작한 것과 불일치였다.

## 조치

1. **`nw-office/reporter.html`**
   - 링크·클릭 이동을 **`article-write.html?id=<key>`** 로 통일 (상대 경로, `기사작성` 버튼과 동일 규칙).
   - `articleRowKey`: `id` → `_id` → `articleId` → `slug` 우선순위, 없으면 `console.error` 및 제목은 링크 비활성.
   - 제목 HTML 이스케이프 (`<`).

2. **`nw-office/article-write.html`**
   - 상세 조회 실패 시 콘솔에 URL·`editId`·status·body 일부 로그.
   - HTTP **403** 이면 사용자 메시지 분리 (`접근 권한이 없습니다`).
   - 목록 폴백 시 동일 키 필드들로 매칭.

3. **`backend/db/articles.js`**, **`backend/routes/articles.js`**
   - 기자 `GET /api/articles/:id` 에서 기사 없음 **404**, 타인 기사 **403** 으로 구분 (`authorIdForArticle`).

## 기준 경로 (통일)

- 기자 대시보드에서 수정/다시보기: **`nw-office/article-write.html?id=<숫자 id>`** (레포 내 단일 패턴).

## 회귀 체크 (수동)

- 목록 제목 클릭 → `article-write.html` 로 로드되는지.
- 신규 작성 직후 목록에 뜬 행도 동일.
- 잘못된 타인 `id` 직접 입력 시 API **403** 및 프론트 안내.
