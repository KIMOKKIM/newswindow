# 최신기사 Top5 데이터 소스

## 호출

- **URL:** `ARTICLES_API + '/api/articles/public/list'`  
  - 운영(www): `https://newswindow-backend.onrender.com/api/articles/public/list` (`script.js`의 프로덕션 `API_ORIGIN`/ `ARTICLES_API` 규칙).

## 백엔드

- **라우트:** `GET /api/articles/public/list` → `articlesDb.listPublishedForMain()`  
- **노출 기준:** 메인용 **게시(published)** 기사만, 최신순.

## 프론트 정렬·개수

- **최신순 필드:** `sortArticleTime` → `published_at || submitted_at || updated_at || created_at` (ISO/파싱 가능 문자열).
- **개수:** `sortByLatest(articles).slice(0, 5)` — **최대 5건**, 미만이면 있는 만큼만.
- **한 건:** 좌측 히어로 고정, 인터벌 없음, 우측 리스트도 1행만.
- **두 건 이상:** 좌측만 3초 `setInterval` 순환; 우측 리스트는 고정 + `is-active`만 동기화.

## 더미/하드코딩

- 없음. API 배열만 사용.
