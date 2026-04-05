# 최신기사 포함 조건 vs 기사 저장 status

## 백엔드 소스 (`backend/db/articles.js`)

- 메인 리스트 API `GET /api/articles/public/list` → `articlesDb.listPublishedForMain()`
- 필터: `isPublicFeedReadableStatus(a.status)`  
  → API/저장 기준으로 **`published`(게시)** 또는 **`submitted`(송고)** 만 포함.  
  (`toApiStatus` 기준 동일 의미)
- **제외**: `draft`, `rejected` 및 그 외 비공개 상태

## 기사 작성·저장 시 status (`insert` / 업데이트 경로)

- 폼에서 넘기는 값은 `canonicalStoreStatus`로 정규화됨.  
  예: `pending` / `sent` → 저장 `'submitted'`, `approved` / `published` → `'published'`.
- **임시저장**만 하면 `draft` → **공개 리스트 미포함**(의도된 동작).
- **송고** 후에는 `submitted` → **포함**.
- **게시** 후에는 `published` → **포함**.

## “작성 후 안 보인다”와 status 불일치

- 실제로 **draft** 로만 남아 있으면 리스트에 없음 → 저장 플로우 확인 필요.
- 본 이슈에서 확인된 **프론트 버그**는 `displayCategory`가 존재하지 않는 함수를 호출해  
  Top5 렌더만 실패하는 경우였다 → API에는 기사가 있어도 **히어로/우측 리스트에 안 그려짐**.

## 조회 vs 저장 소스

- **동일** JSON 파일(또는 `NW_ARTICLES_JSON_PATH`) 상의 `articles` 배열.  
  별도 DB 테이블이 없음(`articlesDb` 메모리 + 파일).
