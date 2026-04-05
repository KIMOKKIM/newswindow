# /admin 공통 셸 마감 보고서

## 1. 수정 전 문제

- 헤더에 **서비스명·역할·액션이 일관되지 않음** (일부 화면은 로그인/포털에 상단 공통 UX 없음).
- **“스태프 초기화면(/admin)”**으로 돌아가는 공통 버튼이 없음.
- **로그아웃 후** 히스토리 뒤로가기로 보호 화면이 남는 사용성 이슈에 대해 **replace 네비게이션** 미적용 구간 존재.
- `/admin` 포털에 로그인된 사용자가 들어오면 **즉시 대시보드로 튕겨**, “포털로 돌아가기” 요구와 충돌.
- **관리자 대시보드**에 짧은 안내 문구 없음, API 403 시 **셸 없이** 메시지만 출력.
- **레이아웃:** 사이드바 없는 화면에서도 `grid`가 2열로 잡혀 **본문 폭이 좁아질 수 있음**.

## 2. 공통 헤더 적용 페이지

동일 `renderShell()` + `bindShell()` 패턴:

- `/admin` 포털
- `/admin/reporter|editor|admin/login`
- `/admin/reporter/signup`, `/admin/editor/signup`
- `/admin/reporter/dashboard`, `/admin/editor/dashboard`, `/admin/admin/dashboard`
- `/admin/article/new`, `/admin/article/:id/edit`, `/admin/article/:id/preview` (기존 유지)
- `/admin/ads`
- 라우터 **404** 화면

## 3. 헤더 필수 요소 (구현)

| 요소 | 구현 |
|------|------|
| 서비스명 | `뉴스의창` (`nw-service-name`) |
| 현재 역할 | 로그인 시: `기자|편집장|관리자 · 이름`, 비로그인 진입 화면: 게스트 배지(기자/편집장/관리자/스태프 포털) |
| 스태프 초기화면 | `#btnShellPortal` → `/admin` |
| 로그아웃 | 세션 있을 때 `#btnLogout` → `clearSession()` 후 `/admin` **`replace: true`** |

## 4. 수정한 파일 목록

- `admin/src/layout/shell.js` — 헤더 재구성, `btnShellPortal` / `btnLogout`, `underTitleHtml`, `nw-admin-layout--single`
- `admin/src/styles.css` — 헤더·역할 배지·포털 embedded·`nw-page-lead` 등
- `admin/src/pages/portal.js` — `renderShell` + 로그인 시 안내 링크, 포털 항상 표시
- `admin/src/pages/roleLogin.js` — `renderShell` + 공통 헤더
- `admin/src/pages/reporterSignup.js`, `editorSignup.js` — 동일
- `admin/src/pages/staffDashboard.js` — 관리자 안내 문(`underTitleHtml`), 403 시 셸 유지
- `admin/src/router.js` — 포털 자동 리다이렉트 제거, 404를 셸로 렌더

## 5. 로그아웃 흐름

1. 사용자가 **로그아웃** 클릭  
2. `localStorage` 세션키 제거 (`clearSession`)  
3. `navigate('/admin', { replace: true })` — 히스토리 상 **로그아웃 직전 보호 URL을 덮어씀** (뒤로가기로 즉시 복귀하기 어렵게 함)  
4. 이후 대시보드 등은 세션 없으면 라우터가 포털/로그인으로 보냄  

## 6. /admin 포털 복귀 흐름

- **스태프 초기화면** 버튼: 항상 `/admin`으로 이동 (상대 경로, 현재 origin 유지).
- 로그인된 사용자도 **포털 카드**에서 다른 역할 로그인·대시보드 진입 가능; 상단에 **내 대시보드** 링크 표시.

## 7. 브라우저 검증

- **자동:** `npm run build` 성공.
- **수동 권장:** 로컬에서 `backend` 실행 + `admin/dist` 서빙 또는 `vite dev`로  
  관리자 로그인 → 대시보드에서 헤더 우측 **스태프 초기화면·로그아웃** 노출, 광고/기사 화면 동일 헤더 확인.

## 8. 남은 이슈

- **운영 도메인** `https://www.newswindow.kr/admin` 은 현재 **HTTP 404 (Vercel)** — `ADMIN_DEPLOYMENT_ROUTE_REPORT.md` 참고. 셸 수정과 무관하게 **배포·rewrite** 필요.
- **뒤로가기 bfcache** 등 브라우저 특수 케이스는 완전 차단은 어렵고, 본 구현은 **replace + 세션 제거**로 일반 시나리오를 우선함.
