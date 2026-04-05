# API health verification matrix (live checks)

검증 시각: 2026-04-01 (로컬 `curl.exe`).  
민감 정보 없음.

| # | 최종 URL | Redirect | HTTP status | 보호 페이지(401 HTML) 여부 | 응답 body (요약) | 비고 |
|---|----------|----------|-------------|----------------------------|------------------|------|
| 1 | `https://www.newswindow.kr/api/health` | 없음 | **404** | **아니오** | **빈 바디**(저장 시 0바이트) | `Server: Vercel`, `X-Render-Origin-Server: Render`, `X-Powered-By: Express`, `Rndr-Id: …` |
| 2 | `https://newswindow.kr/api/health` | **307** → www | (리다이렉트만 기록) | 아니오 | — | `Location: https://www.newswindow.kr/api/health` |
| 3 | `https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health` | 없음 | **401** | **예** | Vercel Authentication HTML | `Set-Cookie: _vercel_sso_nonce=…`, title “Authentication Required” |

## 재현 커맨드

```bash
curl -sS -D - -o NUL "https://www.newswindow.kr/api/health"
curl -sS -D - -o NUL "https://newswindow.kr/api/health"
curl -sS -D - -o NUL "https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health"
```

## 아직 채우지 못한 칸

- **“공식 Production deployment URL”** 한 줄(대시보드의 `*.vercel.app` production alias)은 이 환경에서 확정하지 못해 표에 넣지 않았다. 사용자가 대시보드에서 복사한 URL을 같은 방식으로 한 번 더 찍으면 행을 추가할 수 있다.

## 목표 대비

- `https://www.newswindow.kr/api/health` → **200** 아직 **미달성** (현재 **404**).
