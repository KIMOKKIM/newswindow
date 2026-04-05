# Vercel Deployment Protection 상태

## 이 문서의 한계 (중요)

**Cursor 에이전트 환경에서는 Vercel 대시보드 로그인·Settings 읽기가 불가능하다.**  
`npx vercel whoami` 실행 시 **기존 자격 증명 없음 → 디바이스 로그인 대기**로 중단되었다.

따라서 아래 **“대시보드에서 확정해야 하는 항목”**은 **프로젝트 소유자가 직접** Vercel UI에서 확인·기입해야 한다.  
추측으로 On/Off를 적지 않았다.

---

## HTTP로만 확정한 사항 (preview URL)

| 항목 | 증거 | 확정 내용 |
|------|------|-----------|
| Preview deployment URL | `GET https://newswindow-git-master-teomok1-6097s-projects.vercel.app/api/health` | **HTTP 401**, `Content-Type: text/html`, 본문에 Vercel SSO/“Authentication Required”, `Set-Cookie: _vercel_sso_nonce=…` |
| 의미 | 위 패턴 | **비인증 클라이언트가 해당 preview 호스트의 `/api/health`에 도달하면 Vercel 인증(배포 보호 계열) 응답을 받는다** — 앱 핸들러 JSON 이 아니다. |

위만으로 **Settings > Deployment Protection 에서 정확히 어떤 토글이 켜져 있는지**까지는 UI에서만 확정 가능하다.

---

## 대시보드에서 직접 확인할 체크리스트 (소유자 작업)

경로는 Vercel UI 버전에 따라 문구가 다를 수 있어 **동등 메뉴**로 찾는다.

1. **Project → Settings → Deployment Protection** (또는 *Protect Deployments* / *Vercel Authentication*)
2. 기록할 값:
   - **Preview** deployments: Protected 여부 (Standard Protection / Only Preview / 등)
   - **Production** deployments: 별도 보호 여부
   - **SSO / Authentication Required** 사용 여부
   - **Protection Bypass for Automation** 또는 bypass token 발급 가능 여부 (문서 링크: Vercel deployment protection bypass)

### 소유자 기입란 (복사 후 채움)

| 설정 항목 | 값 (대시보드에서 복사) |
|-----------|------------------------|
| Preview protection | (예: On / Off / Standard …) |
| Production protection | |
| Bypass token 사용 여부 | |

---

## Custom domain 과의 관계 (HTTP 사실만)

`https://www.newswindow.kr/api/health` 는 **401 Vercel 인증 HTML이 아니라 404** 이었다(별도 네트워크 점검).  
→ **“preview 와 동일하게 SSO 페이지만 반환한다”**는 설명은 **www 경로에 대해 성립하지 않는다** (보호 설정이 호스트·배포별로 다를 수 있음 — **대시보드 확인 필요**).
