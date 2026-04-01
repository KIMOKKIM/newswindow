# 대시보드 생존 검증 (최종)

## 전제

- 로그인 성공 시 `localStorage.accessToken` + `role` 이 설정되어야 한다.
- 대시보드 HTML 은 `nw-office/admin.html`, `editor.html`, `reporter.html` 이 각각 **`API_ROOT`** 로 `/api/users`, `/api/articles` 등을 호출하도록 수정되었다 (운영에서 `/api/...` 단일 prefix).

## 브라우저에서 확인할 순서

1. `https://www.newswindow.kr/nw-office/login.html?role=admin` — admin1 로그인 → `admin.html`
2. 동일 사이트에서 편집장/기자 역할에 맞는 로그인 URL 사용 — teomok1 → `editor.html`, teomok2 → `reporter.html`

## 자동화 증거 (API)

백엔드가 응답하는 동안, 로그인 응답 JSON 의 `accessToken` 으로:

- `GET https://www.newswindow.kr/api/users` + `Authorization: Bearer <token>` (admin)
- `GET https://www.newswindow.kr/api/articles` + Bearer (역할별 권한)

…를 호출하면 **404 없이 JSON** 이 오면 대시보드 데이터 로드와 동등한 서버 상태로 볼 수 있다.

## 스크린샷

요청 경로: `docs/screenshots/admin1-dashboard.png` 등 — **이 환경에서는 실제 브라우저 캡처 파일을 생성하지 않았다.** 운영에서 로그인 후 직접 저장하면 된다.
