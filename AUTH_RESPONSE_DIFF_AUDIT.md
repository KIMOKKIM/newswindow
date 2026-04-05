# Render 직접 vs Vercel 프록시 — 로그인 응답 비교

측정 도구: `node scripts/auth-dual-endpoint-check.js`  
측정일: 2026-04-01 (대화 중 연속 실행)

## 공통 요청

- **A (Render 직접):** `POST https://newswindow-backend.onrender.com/api/auth/login`
- **B (Vercel 프록시):** `POST https://www.newswindow.kr/api/auth/login`
- Body: `{"userid":"<id>","password":"…"}`  
- 클라이언트 요청 헤더: `Content-Type: application/json`, `Accept-Encoding: identity`, `Content-Length` 설정

## admin1 / teomok$123

| 항목 | Render (A) | Vercel (B) |
|------|------------|------------|
| status | 200 | 200 |
| content-type | application/json; charset=utf-8 | application/json; charset=utf-8 |
| content-length (응답 헤더) | (본문과 일치하는 값) | 요약 출력 미포함; TCP 본문 0 |
| raw body 길이 | 259 | **0** |
| JSON 파싱 | 성공 | 실패 (Unexpected end of JSON input) |
| accessToken | 있음 | **없음** |
| role | `admin` | **없음** |
| set-cookie | 없음 | 없음 |

Render raw 본문 시작: `{"accessToken":"eyJ...` (JWT), `"role":"admin"`.

Vercel: `rawPreview` 빈 문자열.

## teomok1 / teomok$123

| 항목 | Render (A) | Vercel (B) |
|------|------------|------------|
| status | 200 | 200 |
| raw body 길이 | 283 | **0** |
| JSON / accessToken / role | 정상 (`editor_in_chief`) | 본문 없음 → 파싱·토큰·role 없음 |

## teomok2 / kim$8800811

| 항목 | Render (A) | Vercel (B) |
|------|------------|------------|
| status | 200 | 200 |
| raw body 길이 | 267 | **0** |
| JSON / accessToken / role | 정상 (`reporter`) | 본문 없음 |

## 부가 관측

- 동일 시각에 `curl`/`node`로 Vercel만 호출하면 간헐적으로 `500` 및 `{"error":"proxy_error","message":"fetch failed"}` 가 나오기도 함(Render 측/네트워크 이슈).  
- 본 감사의 **핵심 대비**는: **Render는 항상 비어 있지 않은 JSON**, **Vercel은 status 200인데 TCP 응답 본문 길이 0** 인 반복 재현이다.
