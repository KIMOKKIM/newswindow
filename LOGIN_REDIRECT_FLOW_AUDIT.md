> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 로그인 후 redirect 로직 감사 (`nw-office/login.html`)

## 성공 판정

- `fetch` 후 **`res.ok`** 가 참이면 성공으로 간주.
- 본문은 **`await res.json().catch(() => ({}))`** — 파싱 실패 시 **빈 객체**가 되어 **토큰/역할이 없는 것처럼** 동작할 수 있음.

## redirect 수행 코드

1. `localStorage` 에 `accessToken`, `role`, `name` 저장.
2. `r = (역할 문자열).trim().toLowerCase()` 후 분기:
   - `admin` → `admin.html`
   - `editor_in_chief` → `editor.html`
   - `reporter` → `reporter.html`
   - **그 외 전부** → **`index.html`** (스태프 선택 화면)

## `/nw-office/index.html` 로 가는 직접 원인 (코드 확정)

- 위 **else 분기** (`window.location.href = 'index.html'`) 한 곳뿐이다.
- 따라서 **다음 중 하나**일 때 `index.html` 로 간다:
  - `r` 이 `admin` / `editor_in_chief` / `reporter` 가 아니다.
  - **`r` 이 빈 문자열**이다 (예: 응답에 `role` 없음, JSON 파싱 실패로 `data` 가 `{}`).

## URL 쿼리 `role` (기존)

- `const role = params.get('role');` 로 읽기만 하고 **리다이렉트에는 사용하지 않았다.**
- `index.html` 카드는 `login.html?role=admin` 등으로 진입하므로, **응답 `role` 이 비었을 때** 쿼리를 쓰면 사용자가 선택한 역할과 맞출 수 있다.

## 수정 (이번 작업)

- 응답에서 `role` / `Role` 키 모두 허용.
- **`r` 이 비었을 때** `?role=` 이 `admin` | `reporter` | `editor_in_chief` 중 하나면 **그 값을 `r` 로 사용**.

## 하드코딩 / 대시보드 가드

- `login.html` 은 토큰 저장 후 **즉시 `location.href` 변경**만 수행; 별도 공용 가드는 없음.
- 대시보드별 `admin.html` 등의 **역할 검사**는 **별 파일** — `index.html` 로 보내는 것은 **login.html else** 가 원천.
