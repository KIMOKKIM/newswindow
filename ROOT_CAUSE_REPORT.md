# ROOT_CAUSE_REPORT — 기사 파이프라인 붕괴 원인 및 수정

작성: 2026-04-01

---

## 결론 요약

| 증상 | 실제 원인 | 데이터 삭제 여부 |
|------|-----------|------------------|
| F5·재로그인 후 기자 기사 목록이 비어 보임 | `process.cwd()` 기준으로 `data/articles.json` / `data/users.json` 경로가 달라져 **다른 파일**을 읽거나 빈 DB로 시작함 + `author_id` 숫자 불일치(드물게) | **삭제 아님**. 잘못된 경로의 빈 배열·다른 사용자 DB를 본 경우가 대부분 |
| 기자 제목 클릭 → 스태프 로그인 | 상세·목록 **401** 또는 대시보드 진입 시 `role !== 'reporter'` (**대소문자/공백**) 로 즉시 `login.html` 이동; 또는 만료 토큰으로 상세 GET 401 | — |
| 편집장 목록도 사라짐 | 위와 동일하게 **기사 파일이 빈 경로**로 해석됨 | 삭제 아님 |
| 편집장 제목 클릭 에러 | 상세 API 실패(404/401)·응답 파싱 실패; 과거에는 공개 API 혼용 가능성 | — |
| 메인에 승인 기사 안 보임 | `script.js` / `article.html`이 **`http://127.0.0.1:3001`** 로 고정되어 **3000 백엔드와 불일치** | — |

---

## 문제 1: F5 후 기자 기사가 사라짐

### 재현

1. `node server.js` 실행 디렉터리를 **프로젝트 루트**와 **backend** 폴더에서 번갈아 실행한다.  
2. 한쪽에서 저장한 `articles.json`은 `프로젝트/data` 또는 `backend/data` 중 한 곳에만 쓰인다.  
3. 다른 cwd로 다시 띄우면 **다른 경로의 파일**(또는 없는 파일 → 빈 배열)을 읽는다.

### 원인 (코드 증거)

- `backend/db/articles.js` 및 `backend/db/db.js`가 원래 `path.join(process.cwd(), 'data', …)` 를 사용.  
- `users`는 `data/users.json`, 기사는 `backend/data/articles.json`에만 있고 루트 `data/`에는 `users.json`만 있는 등 **저장소가 분리**될 수 있었음.

### 수정

- `backend/db/articles.js`, `backend/db/db.js`, `backend/routes/ads.js`, `backend/server.js`의 정적 업로드 경로를 **`import.meta.url` 기준 `backend/data`, `backend/uploads`** 로 고정.  
- 기자 목록은 `author_id` 를 **`Number`로 정규화**해 `findByAuthor`·`update` 매칭을 안정화.

### 검증

- 동일 코드로 `node -e "import { articlesDb } from './db/articles.js'..."` 시 항상 `backend/data/articles.json` 기준으로 `count`가 일치함.

---

## 문제 2: 기자 제목 클릭 시 로그인 화면

### 재현

1. JWT 또는 `localStorage.role`이 `Reporter` 등 **대문자**면 `reporter.html` 상단 `role !== 'reporter'` 가 참이 되어 **페이지 로드 즉시** 로그인으로 보냄.  
2. 상세 `GET /api/articles/:id` 가 **401**이면 모달 로직에서 `login.html`로 이동(만료는 정상).

### 수정

- 로그인 응답·저장 `role`을 항상 **소문자**로 (`auth.js`, `login.html`, 각 대시보드 진입 검사).  
- 목록/상세 **403**은 로그인 이동 없이 메시지·오류 영역 처리(기자 목록).

---

## 문제 3·4: 편집장 목록·제목 클릭

### 원인

- 문제 1과 동일: **빈/다른 기사 JSON**이면 목록 0건.  
- 제목 클릭은 동일 인증·역할 이슈 + 상세 id 불일치.

### 수정

- 데이터 경로 고정으로 목록 복구.  
- 편집장 대시보드 `role` 검사 소문자 통일.  
- 상태·필드는 API에서 일관되게 매핑(`toApiStatus`).

---

## 문제 5: 메인·승인 연동

### 원인

- `script.js`: `ADS_API = 'http://127.0.0.1:3001'` 로 **기사 공개 API**까지 3001로 요청 → 로컬에서 기본 백엔드(3000)와 어긋남.  
- `article.html`도 동일.

### 수정

- 로컬에서는 `http://127.0.0.1:3000`을 쓰고, 배포 시에는 동일 출처 `''` 로 `/api/...` 상대 요청.  
- `GET /api/articles/public/list`는 **`published`만**, **`published_at` / `updated_at` / `created_at` 기준 정렬**하도록 백엔드에 `listPublishedForMain()` 추가.

---

## 기사 상태(enum) 정리

| 저장/API 노출 | 의미 |
|----------------|------|
| `draft` | 임시저장 |
| `submitted` | 송고·편집장 큐 (레거시 `pending` / 클라이언트 `pending` 입력은 저장 시 `submitted`로 정규화) |
| `published` | 게시(메인 노출) |
| `rejected` | 반려 |

타임스탬프: `submitted_at`, `published_at`, `rejected_at` (전이 시 기록).

---

## 파이프라인이 끊기던 지점

1. **저장**: cwd 불일치 → 다른 파일에 쓰이거나 빈 목록 조회.  
2. **송고**: 상태는 `submitted`로 통일해 편집장 전체 목록에 포함.  
3. **승인**: `published` + `published_at`.  
4. **메인**: 3001 오타로 API 미수신 → 빈 목록; 수정 후 3000에서 `public/list` 수신.

---

## 운영 시 필수

- **백엔드 프로세스를 재시작**해야 `backend/data` 고정 경로가 적용됨(이미 떠 있는 옛 프로세스는 여전히 예전 cwd 로직일 수 있음).  
- 환경변수 `NW_DEBUG=1` 시 기사 목록 API에 `userId`, `count` 등이 서버 로그에 출력됨.
