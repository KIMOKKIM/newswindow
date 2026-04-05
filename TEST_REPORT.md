# TEST_REPORT — 기사 파이프라인 점검 결과

작성: 2026-04-01  
환경: Windows, Node 백엔드 `backend/`, 정적 `nw-office`·루트 HTML

---

## 자동·모듈 검증 (로컬)

| 항목 | 방법 | 결과 |
|------|------|------|
| `articles.js` 라우트 로드 | `node -e "import('./routes/articles.js')"` | 성공 |
| DB 경로 고정 후 기사 수 | `articlesDb.count()`, `listPublishedForMain().length`, `findByAuthor(5).length` | `count=15`, published=4, author5=3 (현재 `backend/data/articles.json` 기준) |
| API 헬스 | `GET http://127.0.0.1:3000/api/health` | 200 (포트 사용 중인 기존 프로세스 기준) |
| 공개 목록 | `GET /api/articles/public/list` | JSON 배열 반환 (기존 서버 프로세스) |

참고: **코드 배포 후 반드시 기존 `node` 프로세스를 종료하고 `backend`에서 다시 `node server.js`** 해야, `users.json`/`articles.json` 이 모두 `backend/data`에서 읽힙니다. 재시작 전에 로그인 E2E가 실패하면 **옛 cwd로 뜬 프로세스**일 수 있습니다.

---

## 시나리오별 (수동 확인 권장)

다음은 **서버 재시작 후** 브라우저에서 확인할 항목입니다.

| # | 시나리오 | 기대 | 상태 |
|---|-----------|------|------|
| 1 | 기자 새 기사 작성·임시저장 | `draft`, 목록에 표시 | 미실행(수동) |
| 2 | 기자 F5 | 동일 목록 유지 | 코드상 서버 재조회 → 통과 예상 |
| 3 | 기자 재로그인 | 동일 `userid`면 동일 `user.id`·`author_id` 매칭 → 목록 유지 | 통과 예상 |
| 4 | 기자 제목 클릭 | 모달, 401 아니면 로그인 이동 없음 | 통과 예상 |
| 5 | 기자 송고(`pending`/`submitted`) | API에서 `submitted` 저장 | 통과 예상 |
| 6 | 편집장 목록 | 송고 건 표시 | 통과 예상 |
| 7 | 편집장 제목 클릭 | 모달 상세 로드 | 통과 예상 |
| 8 | 편집장 승인 | `published`, 메인 `public/list`에 포함 | 통과 예상 |
| 9 | 메인 index | `published`만, 정렬 최신 | script.js 포트 수정 후 통과 예상 |
| 10 | 로그인 만료만 로그인 유도 | 401만 redirect | 기존 정책 유지 |
| 11 | 잘못된 id | 404 메시지 | 통과 예상 |

---

## 실패·제한 사항

- PowerShell에서 `teomok1` 로그인 프로브는 **재시작 전 기존 프로세스**가 다른 `users.json`을 쓰는 경우 401이 날 수 있음 → **서버 재시작 후** 재검증 필요.  
- 실제 브라우저 E2E(클릭·모달·이미지 저장)는 이 환경에서 전부 자동화하지 않음.

---

## 회귀 방지 체크리스트

1. 백엔드는 항상 `cd backend && node server.js` (또는 `npm start`)로 기동.  
2. `data/` 단독 디렉터리에만 의존하지 말 것 — **소스 기준은 `backend/data`**.  
3. 메인·기사 페이지 로컬 API는 **3000**과 일치하는지 확인.  
4. 새 배포 후 `NW_DEBUG=1` 로 한 번 목록 API 로그 확인.
