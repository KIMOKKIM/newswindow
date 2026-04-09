> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 광고 데이터 소스 감사

## 저장 위치 (백엔드)

- **파일**: `backend/routes/ads.js`  
- **경로**: `process.env.NW_ADS_JSON_PATH`가 있으면 해당 절대 경로, 없으면 `backend/data/ads.json`.  
- **전달**: `GET/PUT /api/ads` (JSON). 인증 요구 여부는 라우트 구현 따름.

## 메인 페이지 (`index.html` + `script.js`)

- **읽기**: `DOMContentLoaded` 시 `fetch(ADS_API + '/api/ads', { cache: 'no-store' })`.  
- **적용**: `applyHeaderAds`, `applySideStacks`, `applyFooterStrip(ads.footer)`.  
- **실패 시**: `catch`에서 `SIDE_ADS` 플레이스홀더와 빈 `side*Stack`, 로컬 배열 `footerAds`(정적 더미)로 `applyFooterStrip` — **서버에 저장된 실제 광고와 다름**.

## 광고 관리 대시보드 (Admin SPA)

- **파일**: `admin/src/api/client.js`의 `apiUrl` / `apiFetch`.  
- **읽기·쓰기**: `VITE_API_ORIGIN` 정규화 후 절대/상대 URL로 `/api/ads` 등 호출.  
- **문제**: 빌드 시 `VITE_API_ORIGIN`이 비어 있고 브라우저 오리진이 `https://www.newswindow.kr`이면 요청은 **`https://www.newswindow.kr/api/...`** → 정적 호스트에서 **404**, 대시보드는 빈/기본 상태처럼 보일 수 있음.

## localStorage / seed

- **메인·Admin 광고 본문**: 코드 기준으로 광고 본 데이터는 **백엔드 JSON 파일**이 소스 오브 트루스.  
- **기사 공개 목록과의 공유**: 없음 (별도 `/api/articles/public/list`).

## 메인 vs 대시보드 저장소 일치 여부

- **의도상 동일**: 둘 다 `백엔드 /api/ads`와 동일 `ads.json`(또는 `NW_ADS_JSON_PATH`).  
- **운영 증상 원인**: **호출 오리진 불일치** — 메인은 (수정 전) www 기준 상대 `/api`, 대시보드도 동일 오리진이면 둘 다 www에서 실패해 “광고 없음”과 “대시보드 초기화”가 동시에 나타남. 백엔드 파일이 비워진 것이 아닐 수 있음.
