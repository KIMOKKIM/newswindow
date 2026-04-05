# Next single deployment fix (one action only)

## 전제

- **BACKEND_URL / Render 가동 여부**는 이번 재정의 범위에서 원인으로 두지 않는다.
- 증거는 **실제 HTTP 응답**과 **현재 레포의 `api/[...path].js`/`backend/server.js` 대조**에 한정한다.

## 단일 최우선 조치 (하나만)

**Vercel 프로젝트에서 Production 배포가 가리키는 deployment가 “현재 Git에 있는 `api/[...path].js`(health 분기 포함 포함)와 동일한 소스에서 빌드되었는지”를 대시보드로 확인하고, 동일하지 않다면 그 커밋으로 Production 재배포한다. 동시에 Domains 탭에서 `newswindow.kr` / `www.newswindow.kr` 가 그 Production deployment에 연결돼 있는지 확인한다.**

### 이유(증거)

1. **Preview URL** 은 **401 Vercel Authentication HTML** 로 막혀 있어, 그 URL로는 함수 검증 자체가 불가하다(`PREVIEW_PROTECTION_IMPACT.md`).
2. **현재 워크스페이스 `api/[...path].js`** 이면 `path === 'health'` 일 때 **프록시 전 JSON 200** 이 나와야 하는데, **실제 `www` 는 404 + Render/Express 헤더** 이다 — **프로덕션 산출물 ≠ 현재 파일** 또는 **요청이 해당 함수로 가지 않음** 둘 중 하나를 의미한다.
3. 이 불일치는 **코드가 아니라 Vercel의 “어떤 deployment가 production이며 도메인이 거기에 붙는지”** 설정으로 해소되는 유형이다(재배포·도메인 고정).

### 명시

- **코드 수정 없이도** 위 단일 조치가 맞는지는 “현재 production이 이미 최신인데도 404인 경우”에는 **추가 증거(함수 로그·deployment SHA)** 가 필요하다. 지금 단계에서 강제할 수 있는 **설정 우선 1조치**는 위 문장으로 한정한다.

### Preview 401 (검증 차단)에 대해

- **별도 단일 조치**: Deployment Protection(또는 Preview 보호)을 끄거나, 문서화된 **bypass** 방식을 쓴다 — 이는 **`www` 404 해결과는 별개**이지만, preview URL로의 자동화 검증을 살리려면 필수다.
