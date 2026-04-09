> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 최신기사(Top5) 데이터 소스 점검

## 호출 API (코드: `script.js` `DOMContentLoaded` 내부 IIFE)

- **URL**: `ARTICLES_API + '/api/articles/public/list'`
- 운영 도메인(`newswindow.kr` / `*.newswindow.kr`): `ARTICLES_API = https://newswindow-backend.onrender.com` →  
  **`https://newswindow-backend.onrender.com/api/articles/public/list`**

## 좌측 히어로 vs 우측 리스트

- **동일 응답 배열** `articles`를 `renderLatestTop5FromList(articles)` 한 함수에서 처리한다.
- 좌측 히어로(`#nwLatestHero*`)와 우측 리스트(`#nwLatestList`)는 같은 데이터·같은 렌더 경로다.

## 실패 시 UI

- **`fetch` 실패 또는 `res.ok === false` 또는 `res.json()` 예외**: `.catch`에서  
  `setLatestTop5EmptyState(..., '기사 목록을 불러오지 못했습니다.', ...)` 
- **`renderLatestTop5FromList` 내부 try/catch**: 표시 단계 예외 시  
  `'최신 기사를 표시하는 중 오류가 났습니다.'`  
  (이 경우 `.then`은 계속 진행되어 `renderSectionListsByCategory` 등은 호출될 수 있음)

## 원격 점검 참고 (이전 대화·curl 기준)

- 동일 public list URL은 **HTTP 200** 및 JSON 배열로 응답 가능함(서버 정상 시).

## 카테고리 섹션이 “살아 있는 것처럼” 보이는 이유

- `index.html`에 **정적 플레이스홀더** 기사 링크가 들어 있음.
- `renderLatestTop5FromList`가 **먼저** 예외로 중단되면 Top5만 오류/빈 상태가 되고,  
  `renderSectionListsByCategory`가 **같은 API 배열로** DOM을 갱신하면 섹션만 API 데이터로 바뀐다.  
  (섹션 렌더는 `displayCategory`를 쓰지 않음)
