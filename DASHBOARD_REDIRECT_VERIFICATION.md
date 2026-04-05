# 대시보드 redirect 검증 (수정 후)

## 기대 동작

사용자가 `index.html` 카드에서 **`/nw-office/login.html?role=<역할>`** 로 들어와 로그인에 성공하면:

- 응답에 **`role` 이 오면** 그 값으로 대시보드 선택.
- 응답에 **`role` 이 비어 있어도** URL의 `role` 이 허용 목록이면 **해당 대시보드**로 이동.

## 브라우저에서 확인할 것 (계정별)

| 계정 | 로그인 진입 URL | 기대 최종 URL |
|------|----------------|---------------|
| admin1 | `…/login.html?role=admin` | `…/admin.html` |
| teomok1 | `…/login.html?role=editor_in_chief` | `…/editor.html` |
| teomok2 | `…/login.html?role=reporter` | `…/reporter.html` |

## 스크린샷

`docs/screenshots/*.png` — 브라우저에서 직접 저장(이 환경에서는 미생성).

## API/렌더

대시보드 데이터 로드는 별도 `GET /api/users` 등 — 토큰이 유효해야 한다. **본문이 비는 200 응답**이면 토큰이 비어 대시보드가 다시 로그인으로 갈 수 있으므로, 그 경우는 **프록시/백엔드 응답 본문**을 추가 점검해야 한다(이번 단일 수정 범위 밖일 수 있음).
