# Preview deployment protection impact (evidence)

## 관측 URL

`https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health`

## 관측 결과

- **HTTP 401 Unauthorized**
- **응답 `Content-Type: text/html; charset=utf-8`**
- **본문**: Vercel SSO/보호 안내 HTML. 예:
  - `<title>Authentication Required</title>`
  - “This page requires Vercel authentication”
  - `Set-Cookie: _vercel_sso_nonce=…`
  - `/.well-known/vercel-user-meta` 및 `vercel.com/sso-api` 로의 리다이렉트 스크립트

## 확정 사항

1. **401의 직접 원인**은 애플리케이션 핸들러(JSON)가 아니라 **Vercel Deployment Protection / Vercel Authentication** 이응답을 가로채는 동작이다(위 HTML·쿠키·타이틀로 확정).
2. 이 보호는 **외부에서 무인증으로 preview deployment URL을 열어 `/api/health` 를 검증하는 것을 막는다** — 함수 존재 여부와 무관하게 **응답 앞단에서 차단**된다.
3. **Custom domain** (`https://www.newswindow.kr/api/health`) 은 **동일한 401 HTML이 아니라 404** 이었다(별문서 `VERCEL_DEPLOYMENT_DOMAIN_MAPPING.md` 참조). 따라서 “custom domain에도 동일 SSO 보호가 걸려 있다”는 일반화는 **현재 관측으로는 확정되지 않는다**(www는 보호 페이지가 아니라 다른 실패 모드).

## 무인증 외부 검증 경로 (증거 기준)

- **Preview deployment URL**: 보호가 켜진 상태라면 **bypass 토큰 / Vercel CLI `vercel curl` / SSO 통과** 없이는 검증 불가 — HTML이 이를 명시한다.
- **Production custom domain**: 401 보호 페이지는 아니었고 **404** — “보호 해제 없이 열리는 경로”이나 “정상 API”는 아니다.

## 요약

- **Preview protection 이 현재 preview URL 검증을 직접 막고 있음**: **확정** (401 HTML).
- **Production custom domain 실패가 동일 보호 때문인지**: **아님** (404 + 다른 헤더 프로파일).
