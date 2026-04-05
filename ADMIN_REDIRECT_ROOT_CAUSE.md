# /admin/admin/dashboard 로 바뀐 직접 원인 (확정)

## 직접 원인 1개

**`admin/src/router.js`의 `renderPathCore`에서 `route.name === 'portal'`(즉 주소가 `/admin`)일 때, 로컬 스토리지 JWT 세션이 있으면 `navigate(..., dashboardPathForRole(session.role), { replace(true) })`로 즉시 URL을 바꿔 버렸기 때문이다.**

- 관리자(`role === 'admin'`)인 경우 `admin/src/auth/session.js`의 `dashboardPathForRole` 반환값은 **`/admin/admin/dashboard`** 이다.  
  여기서 두 번째 `admin`은 Vite `base: '/admin/'`와의 중복이 아니라, **역할 구분 세그먼트**(기자 `…/reporter/…`, 편집장 `…/editor/…`와 같은 패턴으로 관리자만 `…/admin/…`)이다.
- Vite **`base: '/admin/'`** 는 자산(base URL) 접두일 뿐이며, `navigate()`는 `window.history`에 **`/admin/...` 절대 경로**를 넣는다(`new URL(path, origin)`).  
  즉 **basename + 상대경로 이중 결합** 버그가 아니라, **의도된 대시보드 경로 + 포털 자동 리다이렉트 로직**이 합쳐진 결과이다.

## 근거 코드

- 포털에서 세션 시 치환: `admin/src/router.js` (수정 전) `if (route.name === 'portal') { if (session) { await nav(dashboardPathForRole(session.role), ...) } }`
- 관리자 대시보드 경로: `admin/src/auth/session.js` — `if (role === 'admin') return '/admin/admin/dashboard';`

## 푸터 "스태프 로그인" 링크

- `index.html` 등: `https://www.newswindow.kr/admin/` → Vercel에서는 `/admin` SPA로 떨어짐.
- **로그인된 관리자**가 이 링크로 들어오면, 위 자동 `replaceState` 때문에 주소창이 곧바로 **`/admin/admin/dashboard`**로 바뀌어, “예전에는 /admin 에 머물렀던 것처럼” 보이지 않게 된 것이다.

## 이번 수정

- 동일 파일 `admin/src/router.js`에서 **포털 라우트는 세션이 있어도 치환하지 않고** `renderPortal`만 호출하도록 변경(별도 문서의 최소 수정 1건).
