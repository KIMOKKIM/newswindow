# 회원가입·중복확인 (최종)

## 수정된 요청 URL (운영)

파일: `nw-office/signup.html`

- 중복확인: **`GET ${API_ROOT}/users/check?userid=...`** → `https://www.newswindow.kr/api/users/check?userid=...`
- 회원가입: **`POST ${API_ROOT}/auth/signup`** → `https://www.newswindow.kr/api/auth/signup`

**과거:** `http://127.0.0.1:3001` 및 `/api/api/...` 로 운영에서 깨질 수 있었음.

## Vercel 라우트 (명시적)

- `api/users/check.js` → `/api/users/check`
- `api/auth/signup.js` → `/api/auth/signup`

## “서버 연결 실패”

- 네트워크 오류 또는 **프록시 `fetch failed` (500)** 시 catch 블록에서 표시될 수 있음.  
- URL 수정 후에는 **404 NOT_FOUND 가 아닌** 백엔드 JSON 응답이 와야 정상.

## 실제 가입 흐름

백엔드 `auth.js` `signup` 규칙(role reporter/editor_in_chief 등)을 그대로 따른다. 운영 검증은 브라우저에서 회원가입 폼 제출 + 응답 코드 확인.
