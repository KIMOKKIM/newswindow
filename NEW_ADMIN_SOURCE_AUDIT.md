> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 신규 admin 페이지 실제 소스 위치 (리포지토리 기준)

## 확정 사항

| 항목 | 값 |
|------|-----|
| 소스 루트 | `admin/` (Vite 프로젝트) |
| 엔트리 HTML (개발) | `admin/index.html` → `/src/main.js` |
| 앱 엔트리 스크립트 | `admin/src/main.js` → `initRouter` |
| 빌드 명령 (패키지) | `admin/package.json` 의 `build`: `vite build` |
| 빌드 산출물 (로컬) | `admin/dist/index.html`, `admin/dist/assets/*` |
| `base` (자산 URL) | `vite.config.js` 의 `base: '/admin/'` |

## 로컬에서 정상 동작 시 사용하는 명령

- 개발 서버: `cd admin && npm run dev` (Vite, 포트 5173, `/admin/` 베이스)
- 프로덕션형 번들: `cd admin && npm run build` → 산출 `admin/dist/`
- 백엔드가 `admin/dist`를 붙이는 경우: `backend/server.js` 가 `../admin/dist` 를 `/admin` 으로 static 서빙

## 기존 admin 과의 구분 (이 작업 범위)

- **신규 admin**: 위 `admin/` + Vite SPA + 히스토리 라우터 (`admin/src/router.js`). URL 접두 `/admin/...`.
- **기존 admin**: 사용자가 말한 “배포 상태로 존재하는 admin”은 이 리포 안의 **별도 HTML 대시보드(nw-office 등)** 또는 과거 경로와 혼동될 수 있음. 신규 SPA 정적 산출은 **`admin/dist`** 및 배포 시 **`public/admin`**(빌드 스크립트)에만 존재.
