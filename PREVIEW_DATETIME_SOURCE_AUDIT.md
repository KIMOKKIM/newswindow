# 미리보기 날짜·시간 데이터 출처 감사 (Article form)

## 렌더링 위치

- 파일: `admin/src/pages/articleForm.js`
- UI: `#btnPrev` 클릭 → `#prevBody`에 HTML 조립 (미리보기 모달 `#prevModal`)

## API에서 넘어오는 기사 객체

- 로드 경로: `GET /api/articles/:id` → `article = data.article ?? data` (동일 파일 약 72행 근처)
- 백엔드 저장/직렬화 필드(실측): `backend/db/articles.js` — `created_at`, `updated_at`, `published_at` (모두 `nowStr()` 등 문자열로 저장)

## 미리보기에서 쓰는 **원본 필드** (스네이크 케이스)

| 화면 라벨 | 원본 필드(우선) | 비어 있을 때 대체 |
|-----------|-----------------|-------------------|
| 발행일 | `article.published_at` | `article.created_at` |
| 수정일 | `article.updated_at` | `article.created_at` |

- `modifiedAt` / `publishedAt` 같은 카멜케이스 필드는 이 화면의 로드 경로에서 사용하지 않음(백엔드가 내려주는 형태가 스네이크 케이스).

## Date only 로 보였던 **직접 원인**

- 기존 함수 `formatDateYmd`가 `getFullYear` / `getMonth` / `getDate`만 조합해 **연·월·일만** 반환했고, 미리보기는 이 함수로만 발행·수정 문자열을 만들고 있었음.

## 기존 날짜 포맷 유틸

- 동 파일 내 로컬 함수만 사용했음(공용 `formatDateTime`은 article form에 없음).
