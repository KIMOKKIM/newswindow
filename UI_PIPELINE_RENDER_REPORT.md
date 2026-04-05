# UI 파이프라인 렌더 검증 보고서

**기준일:** 2026-04-01  
**완료 판단:** API 성공이 아니라 **실제 화면·네트워크**에서 id **16~20** 추적 가능 여부.  
**자동화 한계:** 이 환경에서는 Chrome DevTools MCP 도구가 비어 있어, **DOM 스크린샷/콘솔은 로컬 브라우저에서** `?nwdebug=1` 및 Network 탭으로 확인해야 한다. 아래 **백엔드·코드·curl** 근거는 이 저장소에서 직접 수집했다.

---

## 1. 프론트가 호출하는 API (호스트/포트/path)

### 기자 작성 리스트 (`nw-office/reporter.html`)

| 항목 | 값 |
|------|-----|
| **실제 호출** | `{API_READ}/articles` = `resolveOfficeApiBase()` + `'/articles'` |
| **로컬/LAN** | `http://127.0.0.1:3000/api/articles` (호스트: 빈 문자/`localhost`/`127.0.0.1`/`::1`/사설 IPv4) |
| **배포 도메인** | `newswindow.kr` / `www` → Render `https://newswindow-backend.onrender.com/api/articles` |
| **그 외** | 같은 출처 상대 경로 `/api/articles` |

구현: `nw-office/js/article-dashboard-common.js`의 `resolveOfficeApiBase()`, `reporter.html`에서 `D.getApiRead()`.

### 메인 페이지 (`index.html` + `script.js`)

| 항목 | 값 |
|------|-----|
| **공개 목록** | `{API_ORIGIN}/api/articles/public/list` |
| **로컬/LAN** | `http://127.0.0.1:3000/api/articles/public/list` (`script.js` `API_ORIGIN`) |
| **광고** | `{ADS_API}/api/ads` (`ADS_API === API_ORIGIN`) |

### `127.0.0.1:3000` 적용 여부

- **메인:** `API_ORIGIN`이 로컬·사설 IP·`::1`에서 `http://127.0.0.1:3000`으로 고정됨 (`script.js`).
- **오피스(기자/편집장/로그인/작성/관리):** `http://127.0.0.1:3000/api` 패턴 통일.
- **보완:** `article.html` 상세, `nw-office/signup.html`, `nw-office/ad-dashboard.html`에서 **LAN/`::1`/file(빈 호스트)** 시 상대 `/api`로 떨어지던 부분을 동일 규칙으로 맞춤.

### 전수 점검 메모

- **3001:** `signup.html` 오류 문구에만 남아 있던 **잘못된 포트 안내**를 **3000**으로 수정.
- **`backend/routes/ads.js`** 업로드용 `baseUrl` 폴백에 `3001` 문자열이 있으나, 이는 **프론트 메인/기자 리스트와 무관**한 서버 내부 표시용.

---

## 2. 네트워크·페이로드 근거 (로컬 백엔드)

동일 머신에서 실행 중인 백엔드에 대해 **Node `http.get`**으로 확인:

```text
GET http://127.0.0.1:3000/api/articles/public/list
→ count 9, ids 16~20 모두 포함. 상위 5건 id: 20,19,18,17,16 (최신순).
카테고리: E2E
제목 예: "[TEST_PIPELINE_20260401_1824] 기사 5" 등
```

**결론:** 올바른 엔드포인트에 연결되면 **id 16~20은 public list JSON에 존재**한다.

### A. 기자 작성 리스트

- **호출:** `GET /api/articles` + `Authorization: Bearer …`
- **백엔드 동작:** 기자 역할이면 **`author_id === JWT user id`** 인 행만 반환 (`articles.js`).
- **id 16~20:** 샘플 작성자가 **user id 10**(`gimkimok_reporter` 계열)이면, **해당 계정으로 로그인했을 때만** 목록에 나온다. 다른 기자로 보면 페이로드에 없음 = **버그가 아니라 정책**.
- **디버그:** `?nwdebug=1` 또는 `localStorage.nwOfficeDebug='1'` 시 콘솔에 `jwtUserId`, `id16to20InPayload` 안내 로그 (`reporter.html`).

### B. 메인 페이지

- **호출:** `GET /api/articles/public/list` (인증 없음).
- **페이로드:** 위와 같이 16~20 포함 확인됨.
- **이전 미노출 원인 후보:** (1) 프론트가 **정적 서버 포트의 상대 `/api`**로 요청 (2) **CORS**로 LAN origin 차단 (3) **섹션 매칭** — 아래 3단계.

---

## 3. 기자 리스트 렌더링

- **추가 필터:** 없음. `list.map`으로 전부 테이블에 그린다.
- **sample 제목 prefix:** DOM에서 제외하는 조건 **없음**.
- **로그 (디버그 모드):** API 원본 개수, JWT `id`, payload 내 16~20 id 목록 (`nwLog` / `console.info`).

---

## 4. 메인 렌더링 로직

| 단계 | 동작 |
|------|------|
| 상태 | 서버가 이미 `published`만 내보냄. 프론트에서 **재필터 없음**. |
| 헤드라인 | `sortByLatest` 후 **첫 1건** 메인, **2~5번째** 사이드 리스트 (`slice(1,5)`) — 현재 DB 순서상 **16~20이 상위 5**이면 모두 헤드라인 블록에 노출. |
| 섹션 리스트 | `majorCategory(category)`로 그룹 키 생성 후 `.section-title` 텍스트와 **문자열 일치**해야 함. |
| **E2E** | 원래 키 `E2E`는 정치/경제 등 **어느 섹션과도 불일치** → 목록 블록에만 안 나올 수 있음. **수정:** `E2E` → **`이슈`** 슬롯으로만 매핑 (`script.js`, 표시용). |
| 이미지 | 헤드라인/섹션 링크는 **이미지 필수 아님**. `cleanBrokenKoreanText`는 `???` 패턴만 제목을 대체. |

---

## 5. 상태값 매핑

- API/DB: `published`, `draft`, `submitted`/`pending`, `rejected` 등.
- 메인 public list: 서버에서 게시건만.
- 기자 표에서 `submitted` → 라벨 「승인대기」(`reporter.html` `statusLabel`).

---

## 6. 브라우저에서 할 실제 확인 (필수)

1. 백엔드: `http://127.0.0.1:3000/api/health`  
2. 정적: 예) `http://127.0.0.1:5500/index.html?nwdebug=1`  
3. **Network:** `articles/public/list` → **200**, 응답 배열에 **16~20**.  
4. **Console:** `[nw-main] list count=`, `TEST id16-20 in payload=`, `headline+side slot ids`  
5. **기자:** `http://127.0.0.1:5500/nw-office/reporter.html` — **user id 10** 계정으로 로그인 후 `articles` 응답에 16~20 포함되는지.

---

## 7. 수정 파일 요약

| 파일 | 내용 |
|------|------|
| `article.html` | 상세 API 베이스: LAN / `::1` / 빈 호스트 → `:3000` |
| `nw-office/signup.html` | `API_ROOT` 동일 규칙; 오류 메시지 3000 포트로 정정 |
| `nw-office/ad-dashboard.html` | `API_ROOT` 동일 규칙 |
| `script.js` | 섹션 표시: `E2E` → `이슈`; `nwdebug` 시 헤드라인 상위 5 id 로그 |
| *(이전 대화 반영)* `nw-office/js/article-dashboard-common.js`, `script.js` `API_ORIGIN`, `backend/server.js` CORS 등 | LAN·file에서 `:3000` 및 CORS 허용 |

---

## 8. 재검증 체크리스트

- [ ] 기자(작성자 계정) 목록에 **16~20** 행 표시  
- [ ] 메인 **헤드라인+우측 4링크**에 **16~20** 제목(또는 일부) 표시  
- [ ] **이슈** 섹션 리스트에 E2E 기사 **최대 4건** 표시 (슬라이스)  
- [ ] F5 후 동일  
- [ ] 재로그인 후 동일  

---

## 9. 남은 이슈

- **실제 DOM 텍스트 스크린샷**은 이 CLI 세션에서 캡처하지 못함 → 위 체크리스트로 사용자 측 마무리 권장.  
- **타 기자 계정**으로는 16~20이 **의도적으로** 리스트에 없음.

---

## 10. 결과 한 줄 요약

**원인:** 프론트가 로컬/LAN/file에서 **백엔드(3000)가 아닌 상대 `/api`**를 쳐 목록이 비거나 CORS로 막혔고, 메인에서는 **`E2E` 카테고리가 섹션 제목과 매칭되지 않음**; 기자 목록은 **작성자 JWT id**와 불일치 시 미포함.

**화면상 위치 (데이터·코드 기준):** id **20**은 **메인 헤드라인 첫 기사**, **19~16**은 **헤드라인 옆 리스트**; **이슈** 섹션 리스트에도 **E2E→이슈** 매핑 후 노출.
