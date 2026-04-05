# API health — post–domain/fix verification matrix

검증 일시: 2026-04-01 (에이전트 `curl.exe`).  
**주의:** “Latest production `.vercel.app`” URL은 대시보드에서 복사해야 하며, 아래에는 **아직 미기입**이다.

---

## 조치 전 스냅샷 (현재)

| # | 최종 URL | Redirect | HTTP status | 보호 페이지 여부 | Body 요약 |
|---|----------|----------|-------------|------------------|-----------|
| 1 | `https://www.newswindow.kr/api/health` | 없음 | **404** | **아니오** (401 SSO HTML 아님) | `curl -o` 시 **0바이트**인 경우 있음 |
| 2 | `https://newswindow.kr/api/health` | **307** → www | 307(최종 아님) | 아니오 | (리다이렉트 본문 생략) |
| 3 | `https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health` | 없음 | **401** | **예** | Vercel Authentication HTML (`_vercel_sso_nonce` 등) |
| 4 | `{대시보드의 Production .vercel.app}/api/health` | (미측정) | **미측정** | **미측정** | 소유자가 URL 붙여넣은 뒤 동일 커맨드로 재측정 |

### 재현 커맨드

```bash
curl -sS -D - -o NUL "https://www.newswindow.kr/api/health"
curl -sS -D - -o NUL "https://newswindow.kr/api/health"
curl -sS -D - -o NUL "https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health"
curl -sS -D - -o NUL "https://YOUR-PRODUCTION.vercel.app/api/health"
```

---

## 조치 후 (소유자가 대시보드 조치 완료 후 채울 표)

| # | URL | status | 보호 페이지 | body (첫 200자) |
|---|-----|--------|-------------|------------------|
| 1 | www …/api/health | | | |
| 2 | apex …/api/health | | | |
| 3 | production .vercel.app … | | | |
| 4 | preview … | | | |

**목표:** `https://www.newswindow.kr/api/health` → **200** (본문 형식은 프로젝트 정책에 따름).
