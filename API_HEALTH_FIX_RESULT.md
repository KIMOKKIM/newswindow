# API health fix — result log

## 변경 요약 (최신)

- 파일: `api/[...path].js`
- `getApiSubpath(req)`: `req.query.path`(유효할 때만) + **`req.url` pathname** (WHATWG `URL`)
- **`path === 'health'`** → **BACKEND 없이도** `{ ok: true, source: "vercel-api-health" }` **200**
- 프록시: `normalizeBackendBase(BACKEND_URL)` 후 **`${base}/api/${path}`** (`/api` 접미사 중복 방지)

## 재배포 후 검증 커맨드

```bash
curl -sS -D - "https://www.newswindow.kr/api/health"
curl -sS -L -D - "https://newswindow.kr/api/health"
curl -sS -D - "https://<LATEST-PRODUCTION>.vercel.app/api/health"
```

**기대:** `HTTP/1.1 200`, body: `{"ok":true,"source":"vercel-api-health"}`  
(apex는 **307→www** 일 수 있음 — `-L` 로 최종 `www` 응답 확인)

## Production 반영 확인 (Git push 이후)

- **커밋:** `e6f3a7f` — `fix(api): health first via URL subpath, normalize BACKEND for /api proxy`
- **push:** `origin/master` 에 반영됨 (`fb3d0f8..e6f3a7f`).

### 재배포 후 측정 (2026-04-01, `curl`)

| URL | status | body |
|-----|--------|------|
| `https://www.newswindow.kr/api/health` | **200** | `{"ok":true,"source":"vercel-api-health"}` |
| `https://newswindow.kr/api/health` (`curl -L`) | **307** → **200** | 최종 동일 JSON |

대시보드 배포 id는 직접 열지 않았으나, **`source: vercel-api-health` 는 본 커밋 핸들러만 내보내므로** Production 엣지가 해당 빌드를 서빙한 것으로 판단 가능하다.

---

## 과거 스냅샷 (푸시 전)

| URL | status | 비고 |
|-----|--------|------|
| www `/api/health` | 404 | 구 배포 |
| preview `.vercel.app` | 401 | 배포 보호 가능 |

## BACKEND_URL 예시

| env 값 | normalize 후 base | `/api/auth/login` 프록시 |
|--------|-------------------|---------------------------|
| `https://x.onrender.com` | `https://x.onrender.com` | `https://x.onrender.com/api/auth/login` |
| `https://x.onrender.com/` | 동일 | 동일 |
| `https://x.onrender.com/api` | `https://x.onrender.com` | 동일 (중복 `/api/api` 없음) |
