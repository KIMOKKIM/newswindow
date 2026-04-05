# Domain assignment 확인 — `newswindow.kr` / `www.newswindow.kr`

## 목적

**apex → www 307** 은 정상일 수 있으나, **`www` 의 `/api/health` 가 404** 일 때  
**커스텀 도메인이 기대하는 Production deployment(함수 포함)와 동일한 엔드포인트를 보고 있는지** 대시보드에서 확정한다.

---

## 1. 정확한 메뉴 경로

1. `https://vercel.com/dashboard` → **해당 Project**
2. **Settings**
3. 왼쪽 또는 섹션 목록에서 **Domains**

(배포별 할당을 보려면 보조로 **Deployments** 에서 Production 행의 `.vercel.app` URL·시간·커밋을 메모해 둔다.)

---

## 2. 확인해야 할 화면 요소

### 2.1 `newswindow.kr`

- 행에 표시되는 내용:
  - **Valid** / **Invalid Configuration** / 경고 아이콘
  - **Production** 으로 붙는지, **Preview** 는 아닌지
- (UI가 허용하면) **어느 deployment / 환경**에 귀속되는지 설명 또는 링크

**체크**

- [ ] Production 에 연결됨
- [ ] Preview / 다른 프로젝트 / 오류 상태

### 2.2 `www.newswindow.kr`

- 위와 동일

**체크**

- [ ] Production 에 연결됨
- [ ] Preview / 오류 상태

### 2.3 Latest production 과의 일치

1. **Deployments** 탭에서 **가장 최신 Production 성공 배포**의:
   - 시간(UTC/로컬)
   - **Commit SHA**
   - **Deployment URL** (`.vercel.app`)
2. Domains 가 “프로젝트의 Production” 에만 연결된다고만 나오는 경우:
   - Vercel은 보통 **현재 Production으로 승격된 배포**를 도메인이 본다.  
   - **수동으로 특정 과거 deployment에 도메인을 고정**하는 실수는 드물지만, 팀에서 **Promote to Production** 을 하지 않은 채 오래된 배포를 보고 있을 수 있는지 **배포 타임라인**으로 확인한다.

**체크**

- [ ] Domains + Deployments 를 대조했을 때 **논리적으로 최신 Production** 을 본다고 판단된다
- [ ] **불일치 가능** (오래된 Production 고정, 미승격, 다른 브랜치 등)

---

## 3. 확인 결과에 따른 가능한 원인 (2가지)

| 결과 | 가능한 원인 |
|------|-------------|
| 도메인 **Invalid** / DNS 미완료 | **원인 C:** 트래픽이 **기대한 Vercel 프로젝트**에 안 들어오거나 엣지에서 잘못 처리됨. (404 패턴은 케이스별) |
| 도메인 **Valid + Production** 인데 **`FUNCTION_VISIBILITY_CHECK` 에서는 함수 없음** | **원인 A** 와 동일 **—** 도메인은 “맞는” 프로젝트를 보지만 **그 Production 빌드에 API 함수가 없음**. |
| 도메인 Valid, **함수는 있는데** 404 | **원인 D:** **같은 deployment라도** path 라우팅·middleware·overrides(예: `vercel.json`)가 `/api/*` 를 가로챔 **—** 대시보드 외 추가 설정 확인 필요. |

---

## 4. 가장 유력한 원인 1개 (도메인 문서만 범위)

- 확정 사실이 **www 404** 인 경우, Domains 가 Valid Production 이면, **가장 흔한 단일 묶음은**  
  **“도메인은 프로젝트 Production 을 보고 있으나, 그 Production 산출물에 `api/[...path]` 가 없다”** (즉 도메인 **할당 오류**라기보다 **배포 산출물·Production 포인터 문제**).  
- **진짜 도메인이 다른 프로젝트/환경을 가리키는 경우**는 Domains 화면에서 **Invalid 또는 다른 프로젝트 표시**로 잡히는 경우가 많다.

---

## 5. 그 다음 조치 1개

- **Invalid / 잘못된 프로젝트:** DNS·Domains 설정을 Vercel 가이드대로 고쳐 **해당 프로젝트 Production** 으로만 향하게 한다.
- **Valid Production + 함수 없음:** **함수가 포함된 커밋으로 Production 재배포**(또는 Promote) 후 Domains 는 그대로 두고 **배포만 맞춘다**.
- **Valid + 함수 있음:** `vercel.json` / Middleware / Routes 를 **한 곳만** 추가 점검 (코드 수정이 아니라 **대시보드 Build 설정·Root Directory** 확인 우선).
