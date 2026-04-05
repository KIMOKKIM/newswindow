# Vercel 대시보드 확인 마스터 체크리스트

이 문서는 **HTTP만으로는 확정할 수 없는** 항목을, Vercel UI에서 **같은 순서**로 확인하기 위한 단일 진입점이다.  
아래 세 파트를 순서대로 끝낸 뒤, **맨 아래 결론 표**에 체크 결과를 옮겨 적는다.

---

## 사전 준비

1. 브라우저에서 https://vercel.com 로그인
2. 해당 사이트가 올라간 **Project** 를 연다 (예: `newswindow` 등 실제 프로젝트 이름)

---

## Part A — Production deployment + Functions / Build Logs

**메뉴 경로:**  
`Vercel Dashboard` → **해당 Project 선택** → 상단 **Deployments** 탭

**해야 할 일:**

1. 목록에서 **Environment 가 Production** 인 배포 중 **가장 위(최신 성공)** 을 연다.  
   - 배포 한 줄을 클릭하면 **deployment 상세** 페이지가 열린다.
2. 상세 페이지에서 다음을 찾는다 (UI 이름은 계정/기간에 따라 **Functions** 또는 **Serverless Functions**, 최근에는 **Resources** 아래에 함수가 묶여 있을 수 있음):
   - **`api/[...path]`** 또는 **`api/[...path].js`** 가 **목록에 보이는지**
3. 같은 상세(또는 **Build** 영역)에서 **Build Logs** 를 연다.
   - 로그 검색창이 있으면 `api`, `[...path]`, `vercel`, `Serverless` 등으로 검색한다.
   - **Serverless Functions** 빌드·번들 관련 줄이 있는지 확인한다.

**기록란**

| 항목 | 예 / 비고 |
|------|-----------|
| Production deployment 이름 또는 URL (`.vercel.app`) | |
| Git commit (short SHA) | |
| Functions / Resources 목록에 `api/[...path]` 보임 | 예 / 아니오 |
| Build Logs 에 function 관련 흔적 | 예 / 아니오 / 로그 확인 안 함 |

---

## Part B — Domains 가 가리키는 대상

**메뉴 경로:**  
`Vercel Dashboard` → **해당 Project** → **Settings** (상단 또는 좌측) → **Domains**

**해야 할 일:**

1. **`newswindow.kr`** 행을 찾는다.  
   - **Production** 에 연결돼 있는지, **Preview** 인지, 경고(Invalid configuration 등)가 있는지 본다.
2. **`www.newswindow.kr`** 행에 대해 동일하게 본다.
3. **Deployments** 로 돌아가 **Part A에서 연 Production 배포**의 `.vercel.app` URL·시간·커밋을 기억해 둔다.
4. Domains 화면 설명/툴팁에 “이 도메인이 어떤 deployment에 붙는지”가 나오면 그 내용을 적는다.  
   - (일부 UI에서는 도메인이 **프로젝트 Production** 에 귀속된다고만 나오고, 특정 deployment id는 Deployments 화면과 대조해야 한다.)

**기록란**

| 도메인 | 연결 Environment | 특정 deployment 표시 여부 | Latest Production 과 동일해 보이는지 |
|--------|-------------------|----------------------------|-------------------------------------|
| newswindow.kr | | | 예 / 아니오 / 판단 불가 |
| www.newswindow.kr | | | 예 / 아니오 / 판단 불가 |

---

## Part C — Deployment Protection

**메뉴 경로:**  
`Vercel Dashboard` → **해당 Project** → **Settings** → **Deployment Protection**  
(또는 **Protect Deployments** / **Vercel Authentication** 등 유사 명칭)

**해야 할 일:**

1. **Preview** 배포에 대한 보호 옵션: **켜짐 / 꺼짐 / Standard Protection** 등 현재 값을 적는다.
2. **Production** 배포에 대한 보호(별도 항목이 있는 경우): 동일하게 적는다.
3. **Authentication Required** (SSO) 클래스의 옵션이 켜져 있는지 확인한다.
4. **Protection Bypass for Automation** / bypass token 관련 문구가 있는지 참고만 한다 (401 우회 검증 시 사용).

**기록란**

| 항목 | 값 |
|------|-----|
| Preview Deployment Protection | |
| Production Deployment Protection | |
| Vercel Authentication / SSO / Authentication Required | 켜짐 / 꺼짐 / 해당 없음 |

---

## 결론 표 (Parts A–C 결과를 모은 뒤 채움)

| 조건 | 의미 |
|------|------|
| Part A: `api/[...path]` **없음** | Production 산출물에 **API 함수가 포함되지 않음** (또는 다른 루트/설정으로 빌드됨). `www` 404의 주후보. |
| Part A: `api/[...path]` **있음** + Part B: 도메인이 **오래된/다른** 배포를 본다 | **도메인·Production 라우팅 불일치** 후보. |
| Part A: 함수 **있음** + Part B: **일치** | `www` 404는 **다음 레이어**(rewrite, upstream, 경로)로 넘어가야 하며, **이번 “대시보드만” 범위를 벗어남** — 별도 이슈로 기록. |
| Part C: Preview 보호 **켜짐** | **`preview deployment URL` 의 401** 은 이 설정과 **일치**하는 정상 동작일 수 있음. **`www` 404와는 별개**일 수 있음. |

---

## 관련 세부 문서

- 함수·빌드만: `FUNCTION_VISIBILITY_CHECK.md`
- 도메인만: `DOMAIN_ASSIGNMENT_CONFIRMATION.md`
- 보호 설정만: `PREVIEW_PROTECTION_CONFIRMATION.md`
