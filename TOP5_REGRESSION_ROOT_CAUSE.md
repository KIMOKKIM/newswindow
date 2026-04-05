# 최신기사(Top5) 섹션 실패 원인

## 운영에서 호출되는 URL (코드 기준)

- `ARTICLES_API + '/api/articles/public/list'`
- 프로덕션 호스트: `nwIsProductionNewswindowHost(hostname)` 가 참이면 `ARTICLES_API = https://newswindow-backend.onrender.com`
- 그 외(로컬·LAN): `http://127.0.0.1:3000` 또는 `NW_CONFIG_API_ORIGIN` / 빈 문자열에 따른 상대 경로

## 원격으로 확인한 사실 (추측 아님)

- `GET https://newswindow-backend.onrender.com/api/articles/public/list` → **HTTP 200**, 본문은 Node `JSON.parse` 통과하는 배열.
- `Origin: https://www.newswindow.kr` 로 동일 URL 요청 시 `access-control-allow-origin: https://www.newswindow.kr` 확인.

즉 **백엔드 다운/전면 CORS 차단만이 원인이라고 단정할 수는 없음.**

## 회귀로 특정한 프론트 직접 원인 (커밋 `80f9ae0`)

1. **`DOMContentLoaded` 전체를 `nwLoadCategoryMap(done)` 안에 넣음**  
   카테고리 JSON `fetch`가 끝나기 전까지 **기사 목록 fetch·광고 fetch·기타 초기화가 전부 지연**됨. 네트워크 지연·캐시 이상 시 체감상 “최신기사가 안 뜬다”와 동일.

2. **`API_ORIGIN` / `ARTICLES_API` 호스트 매칭이 `www`·apex만 포함**  
   `*.newswindow.kr` 서브도메인 등에서는 `API_ORIGIN === ''` → `pubUrl` 이 **`/api/articles/public/list` (현재 출처 기준 상대)** 로 떨어짐. 정적 프론트(Vercel)에는 해당 라우트가 없으면 **404 HTML → `res.json()` 실패 → catch** → 문구 *「기사 목록을 불러오지 못했습니다」* (히어로·우측 리스트 동일 데이터 경로라 **둘 다 비어 보임**).

## 이번 수정 (요약)

- 카테고리 맵: **비차단** (`nwLoadCategoryMap(function () {});` 만 즉시 호출).
- API 베이스: **`newswindow.kr` / `*.newswindow.kr`** 로 Render API 고정.
- Top5 렌더: **`try/catch`** 로 표시 단계 예외 시 섹션만 오류 문구.
- 섹션/TV 렌더: Top5 이후 **`try/catch`** 로 분리 (한 함수 예외가 전체를 덮지 않도록).

## 문서·추적 범위

- 변경 파일: `script.js`, `public/script.js` (동기).
- `index.html` / `public/index.html`: 본 이슈에서 **로더/마크업 변경 없음** (실패 메시지는 스크립트가 `#nwLatestTop5` 에 주입).
