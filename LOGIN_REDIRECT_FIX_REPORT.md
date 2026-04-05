# 로그인 성공 후 대시보드 미이동(먹통) 수정 보고서

**범위:** 로그인 제출 → 토큰·역할 저장 → 역할별 대시보드로 이동만. 기사 작성·목록·승인·메인 미변경.

---

## 1. 로그인 성공 응답 구조 (백엔드)

**파일:** `backend/routes/auth.js`

**JSON (수정 후):**

| 필드 | 설명 |
|------|------|
| `accessToken` | JWT |
| `role` | `admin` / `reporter` / `editor_in_chief` (소문자 정규화) |
| `name` | 표시 이름 |
| `id` | 사용자 id (클라이언트 디버그·추적용, 선택) |

---

## 2. 원인 분석 (코드 기준)

1. **`res.json()` 파싱 결과가 `null`이거나 비객체**인 경우, 기존 코드가 `data.role` 등에 바로 접근하면 **TypeError**가 발생할 수 있음. `catch`에서만 처리되면 사용자는 “먹통” 또는 일반 오류 문구만 보게 됨.
2. **토큰 필드명 차이** (`accessToken` vs `token` vs `access_token`) 또는 프록시/게이트웨이 변형 시 `accessToken`이 비어 **문자열 `"undefined"`만 저장**되고, 이후 페이지 가드와 맞지 않을 수 있음.
3. **응답 본문에 `role`이 빠진 경우** JWT에는 `role`이 있어도, 기존 분기에서 `r`이 비어 **의도와 다른 대시보드나 index**로만 가거나 혼란이 생길 수 있음.

---

## 3. 수정 요약

### `nw-office/login.html`

- 응답 본문을 **항상 객체로 안전화** (`null`/파싱 실패 → `{}`).
- 토큰: `accessToken` | `token` | `access_token` 순으로 추출, 빈 값·문자열 `"undefined"` 거부.
- 역할: 본문 `role` / `Role` / `user.role` 등 → 없으면 **JWT 페이로드의 `role`** 으로 보정.
- 이름: 본문·`user.name`·JWT `name` 보조.
- 저장 순서: **`accessToken` → `role` → `name` localStorage 반영 후** `role` URL 파라미터(`?role=`) 폴백 적용, 다시 `localStorage.role` 동기화.
- 이동: `window.location.replace(...)` 로 명시적 전환 (admin / editor_in_chief / reporter / 그 외 `index.html`).
- **제출 버튼** `disabled` + `finally`로 복구 (연타·중복 제출 시 UI 정지 완화).
- **`?nwdebug=1` 또는 `localStorage.nwOfficeDebug=1`**: `[login] request start`, `response`, `redirect` 로그.

### `backend/routes/auth.js`

- 로그인 응답에 **`id: row.id`** 추가 (본문 필드 보강; 클라이언트는 필수 사용 안 함).

---

## 4. 수정 전 / 후 redirect 분기

| 역할 (`r`) | 수정 전 | 수정 후 |
|------------|---------|---------|
| `admin` | `admin.html` | 동일 |
| `editor_in_chief` | `editor.html` | 동일 |
| `reporter` | `reporter.html` | 동일 |
| 그 외 | `index.html` | 동일 |

차이는 **역할·토큰 결정 로직의 견고함**과 **`replace` 사용**, **실패 시 메시지** 처리.

---

## 5. 브라우저 테스트 (권장 절차)

이 저장소 환경에서는 실제 GUI 브라우저를 자동으로 조작하지 않았습니다. 로컬에서 아래를 수행하면 완료 기준을 만족할 수 있습니다.

1. 백엔드 기동 후 예: `http://127.0.0.1:5500/nw-office/login.html?nwdebug=1&role=reporter`
2. 기자 계정 로그인 → **즉시 `reporter.html`** 로 이동하는지 확인.
3. 편집장·관리자 각각 `editor.html` / `admin.html`.
4. 잘못된 비밀번호 → **페이지 이동 없음**, 오류 문구만.
5. 새로고침 후 `localStorage`에 `accessToken`, `role` 유지 여부.
6. 콘솔에 **로그인 직후 예외** 없는지, Network에 로그인 **200** 후 대시보드 **200** 인지.

---

## 6. 남은 이슈

- 네트워크 오류·타임아웃 시 메시지는 기존과 같이 일반 문구; 별도 재시도 UI는 이번 범위 밖.
