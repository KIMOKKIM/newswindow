# 스태프 인증 E2E 검증 보고

**완료 기준:** 실제 브라우저에서 로그인 → 대시보드 → 기사 작성 → 기사 제목(모달)까지 login 화면으로 튕기지 않음.

## 자동화·CLI에서 수행한 검증

- **정적:** 변경된 HTML/JS 구문은 편집기/린트 기준 오류 없음.
- **API 샘플:** (이전 세션 기준) `POST /api/auth/login` 응답이 `accessToken`·`role`·`name`·`id`를 주면 `setSessionFromLogin`이 `nw_session`에 `editor_in_chief` → `editor`로 저장하는 것이 코드 상 확정.

## 반드시 로컬 브라우저에서 수행할 체크리스트

환경: 백엔드 `http://127.0.0.1:3000`, 정적 `http://127.0.0.1:5500/nw-office/...`

1. **기자:** `login.html` → `reporter.html` 이동.
2. **기사 작성:** `article-write.html` 열림(로그인으로 되돌아가지 않음).
3. **기사 제목 클릭:** 모달 열림; 403/404 시 메시지만(로그인 아님).
4. **편집장:** `login` → `editor.html`.
5. **송고 기사 제목:** 모달 동작, login 아님.
6. **관리자:** `admin.html`, 기사 미리보기 401일 때만 login.
7. **디버그:** `?nwdebug=1`에서 `[auth]`, `[article]` 로그 확인.

## 알려진 제한

- 이 CI/에이전트 세션에서는 **실제 브라우저 클릭·Application 탭의 `nw_session` 확인**을 대신 수행하지 못함. 위 체크리스트 통과 시 본 문서의 “E2E 통과”로 간주.
