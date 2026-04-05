# RECENT_ARTICLE_VISIBILITY_REPORT

작성: 2026-04-01  
방식: 국소 증거 수집 → 원인 1건 → 최소 수정

---

## 1단계: 최근 기사 추적 (backend/data/articles.json)

- **단일 파일**: 프로젝트 전체 `**/articles.json` 검색 결과 `backend/data/articles.json` **1개만** 존재.
- **총 행 수**: 15
- **id 기준 최근 5건** (일부 필드는 레거시 레코드에 없을 수 있음):

| 순위 | id | title (앞 80자) | author_id | status (파일 원문) | created_at | updated_at | submitted_at | published_at |
|------|-----|-----------------|-----------|---------------------|------------|------------|--------------|--------------|
| 1 | 15 | [실시간테스트-20260323-163219] 4차 최종송고 | 10 | published | 2026-03-23 07:32:19 | 2026-03-23 07:32:25 | *(없음)* | *(없음)* |
| 2 | 14 | [테스트] 수정 후 재송고 | 10 | published | 2026-03-23 07:29:30 | 2026-03-23 07:29:30 | *(없음)* | *(없음)* |
| 3 | 13 | 001 BTS노믹스로… | 8 | published | 2026-03-23 07:21:09 | 2026-03-25 03:19:45 | *(없음)* | *(없음)* |
| 4 | 12 | BTS노믹스로… | 8 | pending | 2026-03-23 07:14:19 | 2026-03-23 07:14:42 | *(없음)* | *(없음)* |
| 5 | 11 | 산업용 전기료… | 8 | pending | 2026-03-15 05:39:52 | *(출력 생략)* | | |

*(submitted_at/published_at 컬럼은 JSON에 키가 없으면 비어 있음 — API에서는 `toApiStatus`로 매핑됨.)*

- **author_id 누락**: id 1, 2 샘플만 `author_id` 없음. 최근 id 11~15는 모두 숫자 `author_id` 보유.

---

## 2단계: 저장 경로 검증

- 기사 API는 **`import('../db/articles.js')` → `articlesPath = join(__dirname, '..', 'data', 'articles.json')`** (즉 항상 **backend/data/articles.json**).
- POST/PATCH/insert/update 모두 동일 모듈·동일 `save()` 사용.
- **추가 로그** (`NW_DEBUG=1`):
  - 매 `save()`: `[articlesDb] write path= ... rowCount= ...`
  - `insert` 직후: `[articlesDb] insert id= ... author_id= ... status= ... path= ...`
- 기존 라우트는 이미 `NW_DEBUG=1`일 때 `[articles] POST` 등 로그 출력.

---

## 3단계: 목록 API 수준 추적 (로컬 DB 기준)

동일 워크스페이스에서 Node로 `articlesDb` 호출:

- `findByAuthor(10)` → ids **\[15, 14\]** (최신 글 포함)
- `all()` 상위 ids **\[15, 14, 13\]** …
- **id 15는 `all()`에 존재**

→ **이 JSON을 읽는 로컬 백엔드만 쓴다면**, 기자(user id 10)·편집장 목록 API 모두 id 15를 **제외할 이유가 없음** (기자는 author 10만, 편집장은 전체).

---

## 4단계: 필터 조건

- **기자 대시보드**: `GET /api/articles` → `findByAuthor(req.user.id)` 만. 추가 status/날짜 필터 **없음**. 프론트도 배열 전체 렌더.
- **편집장 대시보드**: `GET /api/articles` → `all()`. submitted만 보이는 필터 **없음**. 프론트도 배열 전체 렌더.
- **따라서 “API는 맞는데 화면 필터로 탈락” 패턴은 아님.**

---

## 5단계: 상태값

- 파일에 `pending`이 남아 있어도 API `toApiStatus`에서 **`submitted`로 내려감**. 편집장/기자 목록에서 **상태만 보고 숨기지 않음**.

---

## 6단계: author_id

- `authorIdNorm`으로 숫자 비교. JWT `user.id`와 레코드 `author_id`가 같은 숫자면 매칭.
- 최근 id 15, 14의 `author_id`는 **10**; **user id 10**으로 로그인 시 기자 목록에 포함되어야 함.

---

## 7단계: 누락 원인 (증거 정리)

로컬 단일 `backend/data/articles.json` + 로컬 API만 사용하는 경우: **목록 누락 재현 불가** (id 15가 findByAuthor(10)·all() 모두에 존재).

남는 대표 원인은 **운영(또는 동일 패턴) 환경에서 읽기/쓰기 API 베이스 불일치**:

- `nw-office/js/article-dashboard-common.js` 및 `article-write.html`에서  
  **쓰기(`getApiWrite`)**: `newswindow.kr` → **Render** `https://newswindow-backend.onrender.com/api`  
  **읽기(`getApiRead`)**: 그동안 **상대 경로 `/api`** (사이트 앞단 프록시/다른 스토어일 수 있음)  
→ **방금 저장한 기사는 Render 디스크에만 있고, 대시보드 목록은 다른 `/api` 소스를 읽는** 경우 양쪽 목록에서 빠짐.

이는 “예전 글은 보이는데 최근 직접 작성분만 안 보임”과도 맞을 수 있음(예전 데이터는 예전 파이프에만 존재).

---

## 8단계: 수정 내용 (최소)

| 파일 | 변경 |
|------|------|
| `nw-office/js/article-dashboard-common.js` | `getApiRead()`: `www.newswindow.kr` / `newswindow.kr` 에서 **Render `/api`와 동일 URL** 사용 (`getApiWrite`와 정렬). |
| `nw-office/article-write.html` | `API_READ` 동일 정렬 + 기자 페이지 `role` **소문자 정규화** (저장 페이지 오탈로 인한 재로그인/세션 혼선 방지). |
| `backend/db/articles.js` | `NW_DEBUG=1`일 때 **write path·insert id·author_id** 로그. |

**의도적으로 하지 않은 것**: 대규모 리팩터, 목록 필터·스키마·상태 기계 전면 변경.

---

## 9단계: 검증 안내 (로컬/운영)

로컬(`localhost` / `127.0.0.1`): 이미 READ/WRITE 모두 `3000`이라 **이번 URL 정렬은 동작 변화 없음**.  
검증은 기존과 같이: 기사 저장 → 기자 목록 → F5 → 재로그인 → 송고 → 편집장 목록.

운영 도메인: 배포 후 **동일 계정**으로 기사 1건 저장 → 기자·편집장 목록에 동일 id가 보이는지 확인.

`NW_DEBUG=1`로 백엔드 기동 시 저장 시 콘솔에 **실제 write path·insert id** 출력.

---

## 요약 한 줄

- **워크스페이스 증거**: 최신 글(id 15)은 `backend/data/articles.json`에 있고, 로컬 DB API는 기자(10)·편집장 목록에 포함해야 정상이다.  
- **실제 미노출 원인 후보 중 코드로 확정 가능한 것**: **운영에서 목록 READ가 POST 저장과 다른 `/api` 백엔드를 보던 가능성** → **READ 베이스를 WRITE와 동일(Render)으로 맞춤**으로 최소 수정했다.
