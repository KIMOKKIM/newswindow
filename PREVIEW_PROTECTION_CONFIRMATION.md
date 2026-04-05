# Preview Deployment Protection 확인

## 목적

**`preview deployment URL` 에 대한 `/api/health` 가 401 Authentication Required** 인 현상이  
**Vercel Deployment Protection / Vercel Authentication** 설정과 **일치하는지** 대시보드에서 확정한다.  
(이 문서는 **Production `www` 404** 의 직접 원인과 **섞지 않는다**.)

---

## 1. 정확한 메뉴 경로

1. `https://vercel.com/dashboard` → **해당 Project**
2. **Settings**
3. **Deployment Protection**  
   - 없으면 **Security** 하위, 또는 **Protect Deployments** / **Vercel Authentication** 등 동일 목적 메뉴 검색

---

## 2. 확인해야 할 화면 요소

### 2.1 Preview 배포 보호

- 레이블 예: **Preview Deployments**, **Standard Protection**, **Only Preview Links** 등
- **켜짐/꺼짐** 또는 단계별(Standard / Enterprise 등) 값을 기록한다.

**체크**

- [ ] Preview 가 보호된다 (비로그인 시 401 유사 응답이 **의도됨**)
- [ ] Preview 보호가 꺼져 있다 (그런데도 401 이면 **다른 원인** 조사)

### 2.2 Authentication Required / Vercel Authentication / SSO

- **Vercel Authentication** 또는 **SSO** 가 **Preview** (또는 **모든 배포**)에 적용되는지
- 문구에 **Authentication Required** 와 연관된 옵션이 있는지

**체크**

- [ ] Preview 에 Vercel Authentication / SSO 가 적용된다
- [ ] 적용되지 않는다

### 2.3 Production 배포 보호

- 동일 페이지에 **Production** 용 보호가 **별도** 있는지 확인한다.

**체크**

- [ ] Production 도 보호된다
- [ ] Production 은 보호되지 않는다 / 해당 없음

### 2.4 Bypass (검증용)

- **Protection Bypass for Automation** 또는 **Bypass Token** 문서 링크가 있으면 메모만 한다.  
  - CI/에이전트가 preview URL을 칠 때 사용.

---

## 3. 확인 결과에 따른 가능한 원인 (2가지)

| 결과 | 가능한 원인 |
|------|-------------|
| Preview 보호 **켜짐** + Authentication 적용 | **원인 P1:** observ된 **401** 은 **앱 버그가 아니라 보호 정책**이다. `preview ... vercel.app` 으로의 무인증 헬스 체크는 **실패하는 것이 정상**. |
| Preview 보호 **꺼짐** 인데도 401 | **원인 P2:** 팀/계정 단위 **SSO**, **Overage**, **다른 프로젝트 설정**, 또는 **잘못된 URL**(다른 보호된 배포) 가능성 — URL과 배포 id를 다시 대조 |

---

## 4. 가장 유력한 원인 1개

- 사용자가 이미 관측한 **401 + Vercel Authentication HTML** 패턴은 대시보드에서 Preview protection 이 켜져 있을 때 **가장 흔히 나는 설명**과 일치한다 → **원인 P1 (의도된 Deployment Protection)** 을 **유력**으로 둔다.  
- **최종 확정**은 이 문서 **§2 체크** 후에만 적는다.

---

## 5. 그 다음 조치 1개

- **외부에서 preview URL을 헬스체크해야 하면:** bypass token 또는 `vercel curl` / 로그인 세션 등 **문서화된 우회** 한 가지만 쓴다.  
- **Production `www` 를 살릴 목적이면:** Preview 설정을 건드리기 전에 **`FUNCTION_VISIBILITY_CHECK` + `DOMAIN_ASSIGNMENT_CONFIRMATION`** 을 먼저 끝낸다 — **401(preview)** 과 **404(www)** 는 원인이 분리될 수 있다.

---

## `www` 404 와의 관계 (한 줄)

- Preview 가 막혀 있어도 **Production custom domain 은 별도**다. **www 404 를 Preview 해제만으로 고칠 수 있다고 가정하지 말 것.**
