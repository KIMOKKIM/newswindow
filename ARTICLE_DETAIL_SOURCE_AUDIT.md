> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 기사 상세 데이터 소스 감사

## 상세 API

- **URL:** `GET {ARTICLES_API}/api/articles/public/:id`
- **백엔드:** `backend/routes/articles.js` — `articlesRouter.get('/public/:id', …)`
- **저장소:** `articlesDb.rawRecord` / `findById` / `incrementPublicViews` — 메인 목록과 **동일한** JSON `articles` 데이터.

## 메인 목록과의 관계

- 메인: `GET {ARTICLES_API}/api/articles/public/list` → `listPublishedForMain()` (`articles.js`).
- 상세: 동일 DB 레코드를 id로 조회 후 `mapDetail` 형태로 응답(게시 건은 조회수 증가 경로 포함).

## 응답 스키마(`mapDetail`, `backend/db/articles.js`)

| 필드 | 용도 |
|------|------|
| `title`, `subtitle` | 제목·부제 |
| `author_name`, `category` | 메타 |
| `content`, `content1`–`content4` | 본문 |
| `image1`–`image4`, `image*_caption` | 이미지·캡션 |
| `created_at`, `updated_at`, `published_at`, `submitted_at`, … | 날짜 |

목록 API의 `thumb` 등 일부 요약 필드는 상세 맵에 없을 수 있음 — 상세는 **이미지/본문 필드**로 렌더.

## 카멜케이스

- 공개 API는 **스네이크 케이스**(`author_name`, `published_at` 등). `publishedAt` 미사용.
