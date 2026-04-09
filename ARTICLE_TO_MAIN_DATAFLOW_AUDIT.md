> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 기사 저장 → 메인 노출 데이터 흐름 (코드 기준)

## 1. 기사 작성·송고 저장

| 단계 | 위치 | 동작 |
|------|------|------|
| Admin 기사 폼 | `admin/src/pages/articleForm.js` | `POST /api/articles` 또는 `PATCH /api/articles/:id`, body에 `status: 'submitted'`(송고) 등 |
| API | `backend/routes/articles.js` | `articlesDb.insert` / `articlesDb.update` |
| 지속 저장 | `backend/db/articles.js` | **`backend/data/articles.json`**에 `fs.writeFileSync` |

송고 시 DB 레코드 상태는 `submitted`(저장 필드 `status` 정규화).

## 2. 메인 페이지 최신 기사 조회

| 단계 | 위치 | 동작 |
|------|------|------|
| 메인 스크립트 | `script.js` | `fetch(ARTICLES_API + '/api/articles/public/list', { cache: 'no-store' })` |
| API | `backend/routes/articles.js` | `articlesRouter.get('/public/list', …)` → `articlesDb.listPublishedForMain()` |
| 데이터 | `backend/db/articles.js` | **동일** `articles` 배열(동일 `articles.json`)에서 필터·정렬 후 JSON 반환 |

**ARTICLES_API**: `window.NW_API_ORIGIN`(Vercel 빌드 주입) 또는 로컬에서 `ADS_API`/`API_ORIGIN`(기본 `http://127.0.0.1:3000` 등).

## 3. 저장소 일치 여부

- **동일**: 메인 목록과 기사 작성 저장 모두 `backend/data/articles.json` ↔ 메모리 `articles` 배열.
- **이전 불일치 원인(수정 전)**  
  1. **상태 필터**: `listPublishedForMain`이 **`published`만** 포함 → **송고(`submitted`)는 메인 API 응답에 없음** → 헤드라인/롤링에 안 나옴.  
  2. **호스트**: 프로덕션에서 `API_ORIGIN === ''`이면 브라우저가 `https://www.newswindow.kr/api/...`로 요청하는데, Vercel에 해당 API 라우트가 없으면 목록 fetch 실패 → 정적 HTML만 보임. **대응**: 빌드 시 `BACK`END_PUBLIC_URL 등으로 `window.NW_API_ORIGIN` 주입(`scripts/vercel-build.mjs`).

## 4. 기사 상세

- 메인·롤링 링크: `/article.html?id=:id`
- `article.html`: `GET /api/articles/public/:id` — **게시·송고** 허용(수정 후). 조회수 증가는 **게시(`published`)만**.
