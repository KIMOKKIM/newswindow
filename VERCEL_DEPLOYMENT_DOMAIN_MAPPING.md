# Vercel deployment / domain mapping (evidence-only)

검증 시각(UTC): 2026-04-01, 로컬에서 `curl` / `Invoke-WebRequest`로 수집.  
**Vercel 대시보드(어느 deployment id에 도메인이 붙는지, Latest Production 메타)는 이 저장소·CLI 접근만으로는 읽을 수 없어 “alias 대상 deployment id”는 미확정이다.**

## 관측한 URL과 상태

| 대상 | 최종 요청 URL | HTTP status | 보호(SSO) 페이지 여부 | 비고 |
|------|---------------|------------|----------------------|------|
| Preview deployment (추정) | `https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health` | **401** | **예** — HTML `<title>Authentication Required</title>`, `Set-Cookie: _vercel_sso_nonce=…`, 본문에 “This page requires Vercel authentication” | 배포 보호가 응답 자체를 가로채는 패턴 |
| Production custom domain (apex) | `https://newswindow.kr/api/health` | **307** → `Location: https://www.newswindow.kr/api/health` | 아니오(리다이렉트만) | apex → www 로 리다이렉트 |
| Production custom domain (www) | `https://www.newswindow.kr/api/health` | **404** | 아니오 | `Server: Vercel`, `X-Vercel-Id` 존재. 동시에 `X-Render-Origin-Server: Render`, `X-Powered-By: Express` — Vercel SSO 401 HTML 이 아님 |
| Production `GET /` (참고) | `https://www.newswindow.kr/` | **200** | 아니오 | 정적 HTML, `Server: Vercel` — 동일 호스트에서 정적은 200 |

## 확정 가능한 것 / 불가한 것

- **확정**: `newswindow-git-master-teomok1-6097s-projects.vercel.app` 에 대한 `/api/health` 요청은 **Vercel 배포 보호(401 HTML)** 로 차단된다.
- **확정**: `www.newswindow.kr` 는 **401 보호 페이지가 아닌 404**를 반환한다(응답 프로파일이 다름).
- **미확정(대시보드 필요)**: custom domain이 **정확히 어떤 deployment id** 에 매핑되는지, 그 deployment가 **preview와 동일 커밋인지** — HTTP만으로는 deployment id를 복원하지 못했다.

## 헤더 증거 발췌 (재현 커맨드)

```text
# Preview
curl -sS -D - -o NUL "https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health"
# → HTTP/1.1 401 Unauthorized, Server: Vercel, Set-Cookie: _vercel_sso_nonce=…

# Custom domain www
curl -sS -D - -o NUL "https://www.newswindow.kr/api/health"
# → HTTP/1.1 404 Not Found, Server: Vercel, X-Render-Origin-Server: Render, X-Powered-By: Express, Rndr-Id: …
```

## 결론(매핑 관점)

- **Preview URL** 과 **custom domain** 의 `/api/health` 는 **같은 “인증 차단 HTML(401)” 패턴을 공유하지 않는다.** 즉 “둘 다 동일한 배포 보호에 막혀 있다”는 설명은 **관측과 모순**이다.
- Custom domain 응답에 **Render origin / Express** 표식이 있는 한, “순수 정적 파일만 있는 Vercel 배포”만 본다는 식의 단순 가설은 **헤더 증거와 맞지 않는다** (정적 전용이면 일반적으로 Express/`X-Render-Origin-Server: Render` 조합이 나오기 어렵다).
