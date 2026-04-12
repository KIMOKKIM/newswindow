# 공개 기사 피드 파이프라인 (통합)

정렬 키는 **단일** 정의: `published_at` → `updated_at` → `created_at` (epoch ms), 동률 시 `id` 내림차순.  
서버: `computeUnifiedPublicFeedSortMs` / `compareUnifiedPublicFeedDesc` (`backend/db/articles.shared.js`).  
프론트 목록 정렬: `sortArticleTime` (`public/script.js`) — 동일 우선순위.

## 단계별 추적

| 단계 | 파일 | 함수 | 정렬 | LIMIT |
|------|------|------|------|-------|
| DB 저장 | `backend/db/articles.supabase.js` | `approveFromSubmitted`, `update`, `insert` | — | — |
| 공개 집합 생성 | `backend/db/articles.supabase.js` | `loadUnifiedPublicFeedRecordsFromDatabase` | JS `compareUnifiedPublicFeedDesc` | 페이지당 최대 1000행 `range` 루프로 전체 적재 후 정렬 |
| 서버 캐시 | `backend/lib/unifiedPublicFeedCache.js` | `getUnifiedPublicFeedCached` | — | 무효화 시까지 동일 배열 재사용 |
| 단일 진입점 | `backend/db/articles.supabase.js` | `getUnifiedPublicFeedRecords` | 위와 동일 | — |
| `/api/articles/public/list` | `backend/routes/articles.js` | `GET /public/list` → `listPublishedForMain` | 슬라이스만 (`mainFeedArticleCap`) | `listPublishedLatest` |
| `/api/home` | `backend/routes/home.js` | `GET /` → `listPublishedForMain` | 동일 슬라이스 | 동일 |
| `/api/home/headlines` | `backend/routes/home.js`, `backend/lib/headlineMemCache.js` | `getHeadlinesRowsCached` → `listPublishedLatestHero` | 통합 피드 앞 5~10건 | `limit` 쿼리 파라미터 |
| 프론트 메인 최신 | `public/script.js` | `nwApplyMainArticlesArray` → `renderLatestTop5FromList` | `sortByLatest` (= 서버와 동일 키) | 화면에서 상위 5건 히어로 |
| 프론트 히어로 | `public/script.js` | `renderLatestTop5FromList` | 동일 | `top5` |

## 캐시 무효화

- **서버**: `clearHomePublicFeedCaches()` → 히어로 메모리 캐시 + **통합 피드 서버 캐시** (`unifiedPublicFeedCache`).
- **프론트**: `localStorage` `nw_main_articles_invalidate` 시 `sessionStorage` `nw_home_bundle_v1`, `nw_headline_hero_v1` 제거 후 번들 재요청.
- **추적 모드**: `?nwfeedtrace=1` 또는 `localStorage.nwfeedtrace=1` 시 세션 캐시 읽기 생략.

## 로그

- 서버: `NW_PUBLIC_FEED_TRACE=1` 또는 `NW_PUBLIC_FEED_DEBUG=1` → `[nw/feed-trace]` 단계별 마커(투썸/삼성 AI 무풍).
- 프론트: `nwfeedtrace=1` → `[nw-main] feed-trace`.
