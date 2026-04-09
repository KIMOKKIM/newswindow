> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 스태프 인증 흐름 감사 (리팩터 전·후 기준 문서)

## 1. 페이지별 인증 소스 (리팩터 **전** — 문제의 근거)

| 페이지 | 진입 가드 근거 | 리다이렉트 |
|--------|------------------|------------|
| `login.html` | 없음 | 성공 시 `localStorage` 다중 키 + `location.replace` |
| `reporter.html` | `localStorage.accessToken` + `localStorage.role === 'reporter'` | 실패 → `login.html?role=reporter` |
| `editor.html` | `token` + `role in (editor_in_chief, admin)` | 실패 → `login.html?role=editor_in_chief` |
| `admin.html` | `token` + `role === 'admin'` | 실패 → `login.html?role=admin` |
| `article-write.html` | `token` + JWT/localStorage `role === 'reporter'` (이중 경로) | 실패 → `login.html?role=reporter` |
| `ad-dashboard.html` | `token` + `role === 'admin'` (trim 없음 등 불일치 가능) | 실패 → login |

### 역할 문자열 출처 (전)

- **서버 로그인 응답:** `role` (소문자 `reporter` / `editor_in_chief` / `admin`).
- **JWT payload:** 동일 원문 role.
- **`localStorage.role`:** 로그인 시 문자열 그대로 저장 → `editor_in_chief` vs 통합 규칙 없음.
- **`?role=`:** 로그인 페이지 링크용; 일부 흐름에서 응답 누락 시 보조로 사용 (인증 단일 기준 위배).

### 중복·충돌

1. **한 페이지는 `localStorage.role`, 다른 페이지는 JWT 보정** → 같은 세션인데 작성 화면만 튕김.
2. **`editor_in_chief` vs 통합 `editor` 없음** → 가드 문자열이 파일마다 상이.
3. **기사 상세 `fetch` 실패 시 `kind === 'auth'`(401)와 동일하게 login 처리**는 올바르나, **403/404를 login으로 보내면 안 됨** — 기존 `classifyFetchError`는 구분했으나, 여러 경로에서 `401`만 보면 되는데 메시지·분기가 분산.

---

## 2. 페이지별 인증 소스 (리팩터 **후** — 단일 기준)

| 구성요소 | 설명 |
|----------|------|
| **저장소** | `localStorage['nw_session']` = `{ token, role, name, userId }` JSON |
| **역할** | JWT/서버 `editor_in_chief` → **`editor`** 로 정규화 (가드·리다이렉트 공통) |
| **JWT** | 만료 시 `getSession()`이 세션 삭제 → 로그인 유도 |
| **레거시** | `accessToken` / `role` / `name` 키는 마이그레이션 후 제거 (최초 `getSession` 시 흡수) |
| **`?role=`** | 스태프 `index.html` 로그인 링크 안내용만 (세션 판정 미사용) |

### 진입 가드

- 전원 `nw-office/js/nw-auth.js`의 `NwAuth.requireAuth` / `NwAuth.requireRole(...)`.

### 로그인 성공 후 이동

- **오직 `login.html`** → `NwAuth.setSessionFromLogin(body)` → `NwAuth.dashboardPathForRole(session.role)`.

### 기사 제목 클릭(상세)

- `NwArticleDashboard.fetchArticleDetail` + `NwAuth.applyDetailAuthFailure`: **401(auth)만** 세션 삭제 후 login.
- **403/404/5xx** → 모달·알림 메시지, login 금지.

---

## 3. 반복 문제의 실제 원인 요약

1. **인증 상태의 저장 키·역할 문자열이 파일마다 달라** 동일 브라우저 세션에서도 페이지 간 불일치 발생.
2. **가드가 localStorage 한 줄에만 의존**하여 JWT와 어긋나면 “대시보드는 열리는데 작성/상세만 로그인” 현상 발생.
3. **로그인 후 저장·리다이렉트 로직이 분산**되어 실패 시 “먹통” 체감 가능.

리팩터로 **세션 단일 객체 + 역할 정규화 + 공통 가드 + 상세 401만 login** 으로 고정.
