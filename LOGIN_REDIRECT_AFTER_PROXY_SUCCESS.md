# 프록시 성공 후 로그인 redirect 검증

## 전제 (달성됨)

`POST https://www.newswindow.kr/api/auth/login` 응답에 **`accessToken`** 과 **`role`** 이 JSON으로 전달됨 (`AUTH_RESPONSE_DIFF_AFTER_PROXY_FIX.md` 측정).

## `nw-office/login.html` 기대 동작

- `res.ok` 이면 `res.json()` 으로 `data.accessToken`, `data.role` 을 읽어 `localStorage` 에 저장.
- `role` 정규화 후:
  - `admin` → `admin.html`
  - `editor_in_chief` → `editor.html`
  - `reporter` → `reporter.html`

## 계정별 기대 최종 URL (브라우저 기준)

| 계정 | role (API) | 최종 이동 URL |
|------|------------|----------------|
| admin1 | `admin` | `https://www.newswindow.kr/nw-office/admin.html` |
| teomok1 | `editor_in_chief` | `https://www.newswindow.kr/nw-office/editor.html` |
| teomok2 | `reporter` | `https://www.newswindow.kr/nw-office/reporter.html` |

## 이 세션에서 한 검증

- **API:** 위 세 계정에 대해 Vercel 프록시 응답 본문·토큰·`role` 이 **자동 스크립트로 Render와 동일**함을 확인.
- **브라우저 UI:** 이 환경에서 실제 클릭·스크린샷 검증은 수행하지 않았다. 배포 후 한 번 브라우저에서 로그인해 주소창·Local Storage·대시보드 메뉴를 확인하면 된다.
