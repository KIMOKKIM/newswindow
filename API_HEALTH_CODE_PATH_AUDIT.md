> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# API `/api/health` — code path audit

## 1. 관측된 증거(사용자 제공)와 이 레포의 대응

- Vercel runtime 로그: `GET /api/health` → **404**, `Host: www.newswindow.kr`  
- 의미: 요청이 **Vercel function 런타임까지 도달**한다. 도메인만의 문제로만 단정하기 어렵다.

## 2. 코드상 404가 나기 쉬웠던 원인(정리)

과거/초기 패턴:

- **`req.query.path` 만** 신뢰 → Vercel에서 비면 **`path` 가 빈 문자열**  
- **`health` 분기가 뒤에 있거나**, 빈 `path` 로 **upstream URL이 어긋난 프록시 요청** → 404

## 3. 현재 `getApiSubpath(req)` 규칙

| 소스 | 처리 |
|------|------|
| `req.query.path` | 정의되어 있고 `''` 가 아니면 사용. **배열**이면 빈 요소 제거 후 `join('/')`. 조합 결과가 `''` 이면 **URL 파싱으로 폴백** |
| `req.url` | `?` 앞만 사용 → `new URL(pathOnly, base).pathname` (**WHATWG URL**) |
| pathname | `/api` 로 시작하면 접두 `/api` 제거 후 앞뒤 `/` 정리 |
| 결과 | `/api/health` → **`health`** |

`url.parse()` 는 **이 파일에서 사용하지 않음**. 플랫폼 DeprecationWarning 과는 별개로, pathname 은 **`URL`** 로만 복원한다.

## 4. health 응답 순서(현재)

- `getApiSubpath(req) === 'health'` 이면 **`BACKEND_URL` 유무와 무관하게** 즉시 **200** 및  
  `{ "ok": true, "source": "vercel-api-health" }`  
- 그 다음에만 `BACKEND_URL` 검사 및 프록시.

## 5. 비-health 프록시 URL — `BACKEND_URL` 정규화

- `normalizeBackendBase(BACKEND_URL)`  
  - 끝의 **`/`** 제거  
  - 경로 끝이 **`/api`** 이면(대소문자 무시: …`/api`) **한 번만** 제거 후 다시 끝 `/` 제거  
- 최종 프록시: **`${normalizeBackendBase(BACKEND)}/api/${path}`**  
- 따라서 `https://host` 도 `https://host/api` 도 **둘 다** `https://host/api/<path>` 로 귀결되어 **`/api/api/...` 이중화 방지**.

## 6. export

- **`module.exports = async function (req, res) { ... }`** (CommonJS, Vercel Node 호환 유지).
