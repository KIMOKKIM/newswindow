# 인증 리팩터 요약

## 단일 기준

- **저장:** `nw_session` JSON 하나 (`token`, `role`, `name`, `userId`).
- **역할:** `reporter` | `editor` | `admin` (서버·JWT의 `editor_in_chief` → `editor`).
- **진입:** `NwAuth.requireRole` / `requireAuth` 만 사용.
- **로그인 후 이동:** `NwAuth.setSessionFromLogin` + `dashboardPathForRole` (login.html 전용).
- **로그아웃:** `NwAuth.clearSession`.
- **상세 조회 401:** `NwAuth.onUnauthorized` 또는 `applyDetailAuthFailure`.
- **역할 불일치(이미 로그인):** `requireRole` 실패 → 안내 후 `index.html` (로그인 페이지 아님).

## 수정·추가 파일

| 파일 | 변경 |
|------|------|
| `nw-office/js/nw-auth.js` | **신규** — 세션 CRUD, 가드, 리다이렉트, 상세 auth 전용 처리 |
| `nw-office/login.html` | `nw-auth.js` 로드, `setSessionFromLogin` + 대시보드 경로만 |
| `nw-office/reporter.html` | IIFE + `requireRole('reporter')`, 모달·목록 401 공통화, 프로필 이름 `patchSession` |
| `nw-office/editor.html` | `requireRole(['editor','admin'])`, 모달·API 401 공통화 |
| `nw-office/admin.html` | `requireRole('admin')`, 목록·미리보기·PATCH 401 구분 |
| `nw-office/ad-dashboard.html` | `requireRole('admin')` |
| `nw-office/article-write.html` | `requireRole('reporter')`, 401 시 `onUnauthorized` |
| `nw-office/js/article-dashboard-common.js` | `[article] detail fetch status` / `denied reason` 디버그 로그 |

## 재발 방지

1. 새 스태프 페이지는 **반드시 `nw-auth.js` 선 로드** 후 `requireRole`/`requireAuth`로 시작.
2. **401만** `onUnauthorized`; 데이터·권한 오류는 UI 메시지.
3. **`localStorage.role` / `accessToken` 직접 사용 금지** (레거시는 `getSession()` 마이그레이션 한 번으로 흡수).
