# /admin 진입·라우팅 재구성 보고서

## 1. 수정 전 문제 요약

- `/admin` 최초 진입이 **통합 로그인(`/admin/login`)으로 바로 유도**되어 역할 선택 포털이 없었음.
- **기자·편집장 회원가입 진입**이 UI에 없고, “통합 관리 앱” 안내 문구만 있었음.
- 대시보드·내부 링크가 `/admin/reporter`, `/admin/editor`, `/admin/admin` 형태로 **역할별 dashboard 경로가 분리되지 않음**.
- 세션 만료·로그아웃 시 `/admin/login` 등 **단일 통합 로그인**으로 모이는 흐름이 남아 있었음.
- 운영 도메인(`https://newswindow.kr/admin`)이 아닌 **특정 호스트로의 “페이지 URL” 하드코딩**은 SPA 본문에는 없었으나, 개발 UX·진입 정책이 요구사항과 불일치.

## 2. 수정한 라우트 구조

| 경로 | 동작 |
|------|------|
| `/admin` | **역할 선택 포털** (비로그인). 로그인된 경우 해당 역할 **dashboard**로 redirect. |
| `/admin/login` | **운영 비노출**: `/admin`으로 **replace redirect**. |
| `/admin/reporter`, `/admin/editor`, `/admin/admin` | **레거시**: 각각 `…/dashboard`로 **redirect**. |
| `/admin/reporter/login` | 기자 로그인 (경로가 역할 고정). |
| `/admin/reporter/signup` | 기자 회원가입 (`role=reporter` 고정, `POST /api/auth/signup`). |
| `/admin/editor/login` | 편집장 로그인. |
| `/admin/editor/signup` | 편집장 회원가입 (`role=editor_in_chief` 고정). |
| `/admin/admin/login` | 관리자 로그인. |
| `/admin/reporter/dashboard` | 기자 대시보드. |
| `/admin/editor/dashboard` | 편집장 대시보드 (관리자가 접근 시 관리자 dashboard로 redirect). |
| `/admin/admin/dashboard` | 관리자 대시보드 (편집장·기자는 각자 dashboard로 redirect). |
| `/admin/ads` | 광고 관리 (관리자만, 기존 로직 유지). |
| `/admin/article/...` | 기존과 동일 (신규 작성·수정·미리보기). 비로그인 시 `/admin` 포털로 이동. |

**페이지 이동**은 모두 **`/admin/...` 상대 경로**이며, 브라우저 **현재 origin**(`newswindow.kr`, `localhost`, 등)에 따라 자동으로 붙습니다. **절대 URL로 127.0.0.1:3000 페이지를 박아 넣는 코드는 `admin/src`에 없음** (`grep` 검증).

## 3. 수정한 파일 목록

- `admin/src/router.js` — 라우트 매칭·포털·역할별 로그인/가입·레거시·`/admin/login` redirect.
- `admin/src/pages/portal.js` — **신규** 스태프 포털 UI.
- `admin/src/pages/roleLogin.js` — **신규** 역할 고정 로그인 (query string 미사용, 성공 후 역할 일치 검증).
- `admin/src/pages/reporterSignup.js` — **신규** 기자 회원가입 + `GET /api/users/check` 중복확인.
- `admin/src/pages/editorSignup.js` — **신규** 편집장 회원가입.
- `admin/src/auth/session.js` — `dashboardPathForRole`, `portalPath`, `loginPathForRole` 추가/변경.
- `admin/src/layout/shell.js` — 네비·로그아웃 목적지를 포털·신규 dashboard 경로로 정리.
- `admin/src/pages/reporter.js`, `staffDashboard.js`, `articleForm.js`, `articlePreview.js`, `ads.js` — 링크·401·active path 정리.
- `admin/src/styles.css` — 포털·회원가입 보조 스타일.
- `admin/vite.config.js` — 개발 프록시 대상을 **환경변수**(`VITE_DEV_API_ORIGIN` / `NW_DEV_API_ORIGIN` / `NW_API_PORT`)로 오버라이드 가능 (페이지 URL과 무관).

**삭제**

- `admin/src/pages/login.js` — 통합 로그인 전용 화면 제거.

## 4. 제거한 통합 로그인 흔적

- “통합 관리 앱 (/admin) — 기자·편집장·관리자” 문구 및 단일 로그인 폼 제거.
- 운영 진입에서 `/admin/login` 사용 중단 → **`/admin`으로만 유도**.
- 로그아웃 목적지: **`/admin` 포털**.

내부적으로는 여전히 **`POST /api/auth/login`** 하나로 인증하되, **어느 경로에서 로그인했는지로 기대 역할을 검증**합니다 (계정 역할과 로그인 화면이 맞지 않으면 세션 저장하지 않음).

## 5. 역할별 로그인·회원가입 경로 표

| 역할 | 로그인 | 회원가입 | 대시보드 |
|------|--------|----------|----------|
| 기자 | `/admin/reporter/login` | `/admin/reporter/signup` | `/admin/reporter/dashboard` |
| 편집장 | `/admin/editor/login` | `/admin/editor/signup` | `/admin/editor/dashboard` |
| 관리자 | `/admin/admin/login` | — (UI 없음) | `/admin/admin/dashboard` |

## 6. 브라우저 검증 결과

- **자동**: `npm run build` 성공. 번들(`admin/dist/assets/*.js`)에 포털 제목·`/admin/reporter/login` 등 **상대 경로** 문자열 포함 확인.
- **수동 권장**: 배포 서버 또는 로컬 백엔드에서 `http(s)://<현재 호스트>/admin` 접속 후 아래 확인.
  1. 포털에 기자/편집장/관리자 카드 3개.
  2. 기자·편집장: 로그인 + 회원가입, 관리자: 로그인만.
  3. 각 버튼이 위 표의 경로로 이동하는지 (개발자 도구 Network / 주소창).

## 7. 남은 이슈

- **편집장 회원가입**은 서버 `POST /api/auth/signup`이 `editor_in_chief`를 허용하는 전제를 사용합니다. 운영 정책상 “가입 후 관리자 승인” 등이 필요하면 백엔드·프로세스는 별도 과제입니다.
- **기자 회원가입**의 “주민번호” 등 민감 정보는 그대로 API로 전송됩니다. 저장·암호화·개인정보 처리 방침은 백엔드/법무 범위입니다.
- Vite 개발 서버의 **API 프록시 기본값**은 `NW_API_PORT` 또는 `127.0.0.1:포트` 조합을 쓸 수 있으나, 이는 **개발 빌드 도구 설정**이며 **사용자에게 보이는 페이지 URL과 무관**합니다. 완전히 고정 IP를 쓰지 않으려면 `VITE_DEV_API_ORIGIN` 등으로 지정하면 됩니다.
