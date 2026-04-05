# Render vs Vercel 로그인 응답 — 프록시 수정 후 (`1fd24f2` 배포 후)

**측정:** `node scripts/auth-dual-endpoint-check.js`  
**시점:** 2026-04-01, `git push` 후 약 45초 경과 뒤

## admin1 / teomok$123

| 항목 | Render direct | Vercel proxy |
|------|---------------|--------------|
| status | 200 | 200 |
| content-type | application/json; charset=utf-8 | application/json; charset=utf-8 |
| raw body length | 259 | **259** |
| JSON parse | 가능 | 가능 |
| accessToken | 있음 | 있음 |
| role | `admin` | `admin` |

원문 형태: 동일 구조 `{"accessToken":"<JWT>","role":"admin","name":"관리자"}` (JWT는 세션마다 달라짐).

## teomok1 / teomok$123

| 항목 | Render direct | Vercel proxy |
|------|---------------|--------------|
| status | 200 | 200 |
| raw body length | 283 | **283** |
| JSON parse | 가능 | 가능 |
| accessToken | 있음 | 있음 |
| role | `editor_in_chief` | `editor_in_chief` |

## teomok2 / kim$8800811

| 항목 | Render direct | Vercel proxy |
|------|---------------|--------------|
| status | 200 | 200 |
| raw body length | 267 | **267** |
| JSON parse | 가능 | 가능 |
| accessToken | 있음 | 있음 |
| role | `reporter` | `reporter` |

## 푸직 직후(배포 전) 참고

동일 스크립트를 푸시 **직후** 즉시 실행했을 때는 Vercel이 여전히 `rawLen: 0`이었다. 이는 **이전 빌드가 아직 라이브**였기 때문으로 보이며, 짧은 대기 후 위 표와 같이 **본문 길이가 Render와 일치**했다.
