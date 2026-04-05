# PIPELINE_E2E_TEST_REPORT

## 1. 테스트 시각

- 실행일시(스크립트·접두사 기준): **2026-04-01**, prefix **`[TEST_PIPELINE_20260401_1824]`**
- API 베이스: `http://127.0.0.1:3000/api`
- 상세 타임라인 원본: `PIPELINE_E2E_EVIDENCE.json`

---

## 2. [1단계] 사전 안전 점검

| 항목 | 내용 |
|------|------|
| 기사 저장 파일 경로 | `backend/db/articles.js` → **`backend/data/articles.json`** (절대경로는 증거 JSON의 `articlesPath` 참고) |
| 테스트 기사 저장 위치 | 위와 **동일 파일**에 **신규 행만 append** (기존 id 1~15 레코드 **수정/삭제 없음**) |
| 운영 vs 테스트 구분 | 제목 prefix **`[TEST_PIPELINE_20260401_1824]`** + 본문에 동일 문자열 포함 |
| 기존 데이터 비손상 근거 | HTTP **POST**로 id **16~20**만 생성, 이후 해당 id에 대해서만 **PATCH**(기자 송고·편집장 승인). 다른 id **미터치** |
| 정리용 id 목록 | **`16, 17, 18, 19, 20`** (필요 시 이 id만 수동 삭제 가능; 본 리포트 범위에서 삭제하지 않음) |

---

## 3. 사용 계정 (인증 방식)

| 역할 | users.json 기준 | 방식 |
|------|-----------------|------|
| 기자 | `id:10`, `userid:gimkimok_reporter` | `JWT_SECRET=dev-secret-change-in-prod`와 동일한 **JWT 직접 발급** (`/api/auth/login` 비밀번호 미문서화) |
| 편집장 | `id:1`, `userid:teomok1` | 동일 |

→ **실제 HTTP 요청은 로컬 백엔드와 100% 동일한 라우트/미들웨어**를 거침.

---

## 4. 테스트 기사 목록 (5개)

| # | 제목 | 부제 | 본문 요약 |
|---|------|------|-----------|
| 1 | `[TEST_PIPELINE_20260401_1824] 기사 1` | 부제 E2E-1 | `본문 구분용 E2E 파이프라인 기사 1 / [TEST_PIPELINE_20260401_1824] / draft 저장` |
| 2 | `… 기사 2` | E2E-2 | 동 패턴 |
| 3 | `… 기사 3` | E2E-3 | 동 패턴 |
| 4 | `… 기사 4` | E2E-4 | 동 패턴 |
| 5 | `… 기사 5` | E2E-5 | 동 패턴 |

- 이미지: **없음** (텍스트만)

---

## 5. 기사별 id 및 상태 변화

| id | 저장 후(응답) | 송고 후(저장소/목록*) | 승인 후 |
|----|----------------|----------------------|---------|
| 16 | `draft` (POST 201) | 목록에 `pending` 표기 (서버 버전에 따라 다름) | `published` |
| 17 | `draft` | 동일 | `published` |
| 18 | `draft` | 동일 | `published` |
| 19 | `draft` | 동일 | `published` |
| 20 | `draft` | 동일 | `published` |

- 송고: `PATCH /api/articles/:id` body `{ "status":"pending" }`.
- 디스크 `articles.json`에서 id 16 최종: `"status":"published"` 확인.

**기자 목록 API**

- `GET /api/articles` (저장 직후): HTTP **200**, 기자 목록 총 **7건**, 테스트 5건 모두 포함·`draft` (증거: `GET_reporter_list_after_save`)
- 송고 후: HTTP **200**, 테스트 id별 상태 응답에 `pending` (증거: `GET_reporter_after_submit`)

**편집장 목록 API**

- `GET /api/articles` (송고 후): HTTP **200**, 전체 **20건**, 테스트 5건 모두 포함 (증거: `GET_editor_after_submit`)

**편집장 상세**

- `GET /api/articles/{16..20}`: 전부 HTTP **200** (증거: `GET_detail_editor`)

**승인**

- `PATCH /api/articles/{id}` body `{ "action":"approve" }`: 전부 HTTP **200**, 메시지 `승인되었습니다.` (증거: `PATCH_approve`)

**메인 목록 API**

- `GET /api/articles/public/list`: HTTP **200**, 게시 목록 총 **9건**, 테스트 id **16~20 전부 `inMainApi: true`** (증거: `GET_public_list`)
- 정렬: 응답 앞쪽에 **id 20 → 19 → … → 16** 순으로 테스트 기사 5개가 나란히 오고, 그 다음 기존 게시 기사(예: 15, 14, 13) — **최신 id 우선** 형태 확인

**비승인 기사 공개 차단**

- 기존 `pending` 기사 id **12**: `GET /api/articles/public/12` → HTTP **403** (비게시 노출 안 됨)

**공개 상세**

- `GET /api/articles/public/16`: HTTP **200**, JSON에 `status` 포함 (통과)

---

## 6. F5 / 재로그인 (브라우저 미사용 시 대체 증거)

브라우저에서 F5/재로그인 **클릭 테스트는 미실행**.  
대신 **동일 엔드포인트**에 대해:

- 새로 발급한 기자 JWT로 `GET /api/articles/16` 재호출 → HTTP **200**, `published` (서버 재조회와 동일 효과)

---

## 7. 화면(UI) 반영

이번 검증은 **대시보드/메인이 사용하는 것과 동일한 REST 응답**을 직접 검증.  
실제 브라우저에서 카드·모달 DOM까지의 시각 확인은 포함하지 않음.

---

## 8. 실패 기사 수 / 원인

- **실패 0건** (5/5 저장·송고·승인·메인 API 포함 전부 성공)

---

## 9. 최종 카운트 (요구 [10단계] 형식)

| 지표 | 값 |
|------|-----|
| 테스트한 기사 수 | **5** |
| 저장 성공 수 | **5** |
| 송고 성공 수 | **5** (PATCH 200×5) |
| 승인 성공 수 | **5** |
| 메인 API 노출 성공 수 | **5** |
| 실패 기사 수 | **0** |
| 실패 원인 요약 | 없음 |
| 생성된 테스트 기사 id 목록 | **`16, 17, 18, 19, 20`** |

---

## 10. 전체 결론

- **전체 성공**: 기자 작성(POST)·목록 확인(GET)·송고(PATCH)·편집장 목록/상세(GET)·승인(PATCH)·메인 공개 목록(GET) 및 공개 상세(GET)·비게시 403까지 **동일 로컬 백엔드에서 검증 완료**.
- **수정 제안**: 없음 (이번은 **기능 검증만** 수행; 코드 변경 없음).  
  참고: E2E 스크립트는 `backend/scripts/pipeline-e2e.mjs`에 보관(재실행 시 **추가 기사가 또 생김** — 운영 전 `E2E_API`·prefix 확인 권장).

---

## 11. 부록: 원본 증거 파일

- `PIPELINE_E2E_EVIDENCE.json` — 단계별 URL, status, payload 요약
