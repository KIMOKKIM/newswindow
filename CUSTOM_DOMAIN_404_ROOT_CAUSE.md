# Custom domain `/api/health` 404 — root cause (evidence-bound)

## 관측 (재현)

요청: `GET https://www.newswindow.kr/api/health`

- **Status**: `404 Not Found`
- **Body 길이**: `curl` 로 저장 시 **0바이트** (빈 응답 바디)
- **대표 응답 헤더** (발췌):
  - `Server: Vercel`
  - `X-Vercel-Id: …`
  - `X-Vercel-Cache: MISS` (일부 요청)
  - `X-Render-Origin-Server: Render`
  - `X-Powered-By: Express`
  - `Rndr-Id: …` (Render 쪽 요청 추적 id 형태)

## 사용자가 요구한 A/B 분류에 대한 답

- **A. custom domain이 function 없는 다른 deployment를 본다**  
  - **순수 “함수 없이 정적만” 시나리오**라면, 관측된 **`X-Powered-By: Express` + `X-Render-Origin-Server: Render`** 조합은 설명하기 어렵다.  
  - 따라서 **“오직 A(정적 전용 배포만 연결)”로 단정하는 것은 이 HTTP 증거와 맞지 않는다.**

- **B. 올바른 deployment이나 routes/function 설정이 적용되지 않는다**  
  - “적용되지 않음”을 넓게 해석하면(요청이 **의도한 serverless JSON 응답**에 도달하지 못하고 **404 + Express/Render 표식**이 붙은 응답이 나온다) **관측과 더 잘 맞는다.**  
  - 다만 **정확한 메커니즘**(대시보드의 rewrite, 오래된 deployment 산출물, path 조립 불일치 등)은 **Build / Deployment summary / Functions 탭** 없이는 **추가 단정 불가**다.

## 레포 코드와의 정합성 (추측 아님, 파일 대조)

현재 워크스페이스의 `api/[...path].js` 는 `BACKEND_URL` 이 비어 있지 않고, `req.query.path` 가 `health` 로 들어오면 **`/health`로 upstream fetch 전에** 아래 분기로 **JSON 200** 을 반환한다:

```12:20:c:\Users\elini\Desktop\My code\newswindow\api\[...path].js
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  const target = `${BACKEND.replace(/\/$/, '')}/${path}`;

  // Minimal safe fallback: respond to health checks from the function itself
  if (path === 'health' || path === '/health' || path.endsWith('/health')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, source: 'vercel-proxy-fallback' }));
    return;
  }
```

백엔드 Express 는 **`/api/health`** 를 정의한다:

```37:38:c:\Users\elini\Desktop\My code\newswindow\backend\server.js
app.get('/api/health', (req, res) => {
```

**논리적 함의(추측이 아니라 분기 결과)**:

- 만약 프로덕션에서 실행 중인 핸들러가 **위 파일과 동일**하고, Vercel이 `/api/health` 에 대해 **`path === 'health'`** 로 넘긴다면, **응답은 JSON 200** 이어야 한다.
- 실제 관측은 **404 + Express/Render 헤더** 이다.

따라서 **적어도 다음 중 하나는 참**이어야 관측과 모순되지 않는다:

1. 프로덕션에 배포된 `api/[...path].js` 가 **위 워크스페이스 내용과 다르다**(이전 커밋 / 미배포).
2. `/api/health` 요청이 **이 핸들러로 라우팅되지 않고**, 다른 경로(예: upstream 프록시)로 처리된다.
3. `req.query.path` 값이 **`health` 가 아니어서** health 분기에 들어가지 않고, upstream이 **404** 를 반환한다.

**Build logs / deployment summary / functions listing / runtime logs** 는 이 실행 환경에서 읽지 못했으므로 **어느 한 줄로만 좁히지는 않았다.**

## 대시보드에서 확정해야 할 항목 (미수행 — 접근 없음)

- Custom domain이 붙은 deployment 의 **커밋 SHA**
- 해당 deployment 의 **Functions 목록**에 `api/[...path]` 존재 여부
- **Rewrites / Routes** 에 `/api` 에 대한 별도 규칙

## 소결

- **404의 직접 원인을 “커스텀 도메인이 무조건 함수 없는 배포만 본다(A)”로만 단정할 수 없다** — 헤더 증거가 이를 반증한다.
- **“라우팅/산출물이 기대와 다르다(B)” 쪽으로 관측을 모으는 것이 타당**하며, 그 세부 원인은 **배포 산출물·함수 탭·로그**로 확정해야 한다.
