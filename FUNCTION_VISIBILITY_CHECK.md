# Function visibility 확인 — `api/[...path]`

## 목적

**`https://www.newswindow.kr/api/health` 가 404** 일 때, 그 이유가 **Production 배포에 Serverless Function이 실제로 포함되지 않았기 때문인지**를 대시보드에서 판별한다.

---

## 1. 정확한 메뉴 경로

1. `https://vercel.com/dashboard`
2. **Project** 클릭 (newswindow 가 실제 이름)
3. 상단 **Deployments**
4. **Production** 라벨이 붙은 배포 중 **시간상 최신이며 성공(Ready)** 인 항목 **한 줄 클릭**
5. 열린 **Deployment 상세** 페이지에서 아래를 탐색

---

## 2. 확인해야 할 화면 요소

### 2.1 Functions / Serverless Functions / Resources

- 상세 페이지의 탭 또는 섹션 이름 후보:
  - **Functions**
  - **Serverless Functions**
  - **Resources** (그 안에 Lambda/Node 함수 목록)
- 목록 또는 트리에서 다음 **문자열**을 찾는다:
  - **`api/[...path]`**
  - 또는 **`api/[...path].js`**
  - (프로젝트에 따라 `api/health` 같은 개별 파일이 아니라 **catch-all** 한 개가 보여야 정상에 가깝다.)

**체크**

- [ ] `api/[...path]` (또는 동일 역할의 catch-all) 가 **보인다**
- [ ] **보이지 않는다** / 목록이 비어 있다 / 정적 파일만 있다

### 2.2 Build Logs

- 같은 deployment 상세에서 **Building** / **Build Logs** 로 스크롤
- 확인할 **키워드** (검색 가능하면 검색):
  - `Serverless`
  - `api/`
  - `Functions`
  - `[@vercel]` / `vercel` / `bundling`

**체크**

- [ ] function 빌드·번들에 해당하는 **명시적 로그 줄**이 있다
- [ ] 없다 / 정적 출력만 있다

### 2.3 (선택) Runtime Logs

- **Logs** / **Runtime Logs** 에서 최근에 `/api/health` 요청이 잡히는지 본다.  
  - **함수가 배포됐는데 404** 인 경우와 **함수 미배포** 인 경우를 나중에 가른다.

---

## 3. 확인 결과에 따른 가능한 원인 (2가지)

| Part 2.1·2.2 결과 | 가능한 원인 (대시보드 관점) |
|-------------------|----------------------------|
| **함수 없음 / 빌드에 흔적 없음** | **원인 A:** Production이 **정적·동적 혼합 중 API 함수가 빠진 빌드**를 가리키거나, Root Directory / 빌드 출력 때문에 **`api/`가 배포 산출물에 포함되지 않음**. |
| **함수 있음 / 빌드 흔적 있음** | **원인 B:** 함수는 배포됐으나 **도메인이 그 deployment를 보지 않음** 또는 **동일 프로젝트 내 다른 엔드포인트/rewrite** 가 먼저 응답함. (이때는 `DOMAIN_ASSIGNMENT_CONFIRMATION.md` 로 이어짐) |

---

## 4. 가장 유력한 원인 1개 (이 문서 범위)

- 사용자가 제공한 확정 사항(**`www` 404**)과 가장 잘 맞는 **첫 번째 가설**은:  
  **원인 A — Production에 `api/[...path]` 가 실제로 배포되지 않았거나, 대시보드에서 최신 Production이 그 빌드가 아니다.**  
  단, **Part B(도메인)까지 확인하기 전**에는 A와 B를 완전히 분리해 확정하지 말 것.

---

## 5. 그 다음 조치 1개

- **원인 A가 확인되면:** 저장소에 `api/[...pattern].js` 가 포함된 **브랜치·커밋에서 Production 재배포**를 걸고, 다시 이 체크리스트로 **Functions 목록에 catch-all이 나타나는지** 확인한다. (**코드 수정 없이** “올바른 소스로 다시 배포”만 하는 경우가 많다.)
- **원인 B가 확인되면:** `DOMAIN_ASSIGNMENT_CONFIRMATION.md` 의 **도메인·Production 정렬** 조치 한 가지만 진행한다.
