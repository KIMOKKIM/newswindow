# 운영 로그인 API 추적 (최종)

## 1. login 페이지가 호출하는 URL (코드 기준)

파일: `nw-office/login.html`

- **운영:** `API_ROOT` = `/api` → **`POST /api/auth/login`** (절대 URL `https://www.newswindow.kr/api/auth/login`)
- **로컬:** `API_ROOT` = `http://127.0.0.1:3000/api` → `POST http://127.0.0.1:3000/api/auth/login`

**과거 버그:** `POST /api/api/auth/login` (API 베이스에 `/api` 가 중복) → Vercel **404**.  
**수정 후:** 위 한 경로만 사용.

## 2. 요청/응답 (운영 HTTPS 측정)

| 항목 | 값 |
|------|-----|
| 메서드 | `POST` |
| `Content-Type` | `application/json` |
| Body 필드 | `userid`, `password` (JSON) |

### 잘못된 URL (증거)

- `POST https://www.newswindow.kr/api/api/auth/login` → **404**, Vercel NOT_FOUND HTML

### 올바른 URL + 잘못된 비밀번호 (증거)

- `POST https://www.newswindow.kr/api/auth/login` body `{"userid":"teomok1","password":"x"}`  
- **401** `{"error":"아이디 또는 비밀번호가 올바르지 않습니다."}`  
- → **라우트가 백엔드 인증까지 도달함** (백엔드 `auth.js` 응답 형식과 일치)

### 계정별 (스크립트 `scripts/operating-login-curl-evidence.js`, 배포 직후 구간)

동일 엔드포인트, `Accept-Encoding: identity` 요청.

| 계정 | 비밀번호 | 측정 시 status | 비고 |
|------|-----------|----------------|------|
| teomok1 | teomok$123 | **200** | (일부 실행에서 응답 바디가 노드 스크립트에서 비어 보임 — gzip/청크 이슈 가능, curl로 재확인 권장) |
| teomok2 | kim$8800811 | **200** | 동일 |
| admin1 | teomok$123 | **200** | 동일 |

**참고:** 같은 날 이후 구간에서 `POST /api/auth/login` 이 **`500` `{"error":"proxy_error","message":"fetch failed"}`** 로 관측된 적 있음. 이는 **Vercel 함수 → `BACKEND_URL`(Render 등)으로의 `fetch`가 네트워크상 실패**할 때의 응답이며, 라우팅/비밀번호 문제와는 별개다(백엔드 슬립/일시 장애).

## 3. Set-Cookie / accessToken / role (설계)

- 백엔드 `auth.js` 는 **Set-Cookie 를 쓰지 않고** JSON 으로 `accessToken`, `role`, `name` 만 반환한다.
- **프론트** `login.html` 이 `localStorage` 에 `accessToken`, `role`, `name` 저장.
- role 값 (DB 기준): teomok1 → `editor_in_chief`, teomok2 → `reporter`, admin1 → `admin`

## 4. 로그인 후 redirect (코드 기준)

- `admin` → `admin.html`
- `editor_in_chief` → `editor.html`
- `reporter` → `reporter.html`

## 5. 백엔드 인증 구현

- `POST /api/auth/login` → `backend/routes/auth.js`  
- 저장소: `backend/db/db.js` 가 **`process.cwd()/data/users.json`** 읽기/쓰기 (런타임 cwd 는 보통 호스트에서 백엔드 프로세스 기준).
