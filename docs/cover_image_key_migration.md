# cover_image_key 운영 점검 체크리스트

아래 문서는 운영 배포 직전에 바로 사용할 수 있도록 정리한 체크리스트입니다. 코드 수정·커밋·푸시 없이, 운영자가 DB 마이그레이션과 서버 반영 시 단계별로 점검할 수 있도록 구성되어 있습니다.

---

## 배포 전 확인사항
- [ ] 운영 배포(maintenance) 시간 및 담당자/롤백 담당자 지정
- [ ] 운영 DB 스냅샷(또는 백업) 생성 및 백업 ID 기록
- [ ] 스테이징 환경에서 동일 마이그레이션 적용 및 검증 완료
- [ ] 배포 문서(이 체크리스트) 공유 및 승인
- [ ] articles.json(로컬 테스트 파일)은 절대 커밋·배포 대상 아님 확인

- [ ] 마이그레이션 SQL 초안 준비 및 검토

```sql
-- 트랜잭션으로 안전하게 적용 (Postgres / Supabase)
BEGIN;

ALTER TABLE public.articles
  ADD COLUMN cover_image_key text;

-- (선택) 엄격한 허용값 체크 제약 (추가 시 쓰기 영향 고려)
-- ALTER TABLE public.articles
--   ADD CONSTRAINT chk_cover_image_key_allowed
--   CHECK (cover_image_key IS NULL OR cover_image_key IN ('image1','image2','image3','image4'));

COMMIT;
```

- [ ] NULL 허용 여부: 컬럼은 NULL 허용(하위호환 목적).

---

## 배포 절차 (권장 순서)

1) DB 반영
- [ ] 운영 DB 백업(스냅샷) 확인
- [ ] 마이그레이션 SQL 실행 (트랜잭션 사용)
- [ ] 컬럼 존재 확인:
  - [ ] SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='cover_image_key';
- [ ] (선택) CHECK 제약/인덱스는 별도 단계로 적용(쓰기 영향 고려)

2) 서버 반영
- [ ] 서버(backend) 배포(새 코드) — DB 적용 후 배포
- [ ] 롤링 또는 블루그린 배포 권장
- [ ] 서버 로그·에러 모니터링 활성화

3) 관리자(작성폼) 확인
- [ ] 관리자(작성) 폼에서 대표이미지 선택(coverImageKey 포함)으로 새 기사 작성(또는 API 시뮬레이션)
- [ ] 수정 재진입: GET /api/articles/:id 응답에서 `coverImageKey` 반환 확인
- [ ] 선택 변경: PATCH /api/articles/:id 로 coverImageKey 변경 후 반영 확인
- [ ] 선택 해제: PATCH로 빈값('' 또는 null) 전송 후 DB 값 비워짐 확인

4) 홈·리스트·히어로 확인
- [ ] GET /api/articles/public/list — `primaryImage`/`thumb`/`imageUrl`/`image_url` 네 키가 동일한 canonical URL인지 확인
- [ ] GET /api/articles/public/latest?hero=1 — 히어로 JSON 반영 확인
- [ ] GET /api/home — latestArticles/popularArticles 반영 확인
- [ ] 메인 최신기사 실화면에서 대표이미지 시각 확인(스크린샷)

5) 캐시 무효화
- [ ] 애플리케이션 내부 캐시 무효화 (invalidateArticleDerivedCaches, bumpMainArticleListCache)
- [ ] CDN/edge 캐시 수동 퍼지(purge) 필요 시 수행
- [ ] 캐시 무효화 후 API 재조회로 반영 확인

---

## 배포 후 확인사항
- [ ] 서비스 정상 동작(에러 5xx/4xx 모니터링)
- [ ] 최근 생성/수정된 기사에서 API·UI 반영 확인
- [ ] 모니터링: API 지연, 응답 크기, 이미지 로드 실패율 점검(1~2시간 집중)
- [ ] 캐시 관련 이상 징후(지연) 여부 확인
- [ ] server logs에 cover_image_key 관련 경고/에러 확인

---

## 롤백 절차

1) 애플리케이션(코드) 롤백(우선)
- [ ] 새 코드에서 문제 발생 시 애플리케이션을 이전 검증 리비전으로 롤백
- [ ] 롤백 후 서비스 정상성 확인(읽기·쓰기)

2) DB 복원(최후 수단)
- [ ] 앱 롤백으로 해결되지 않을 경우에만 DB 스냅샷 복원 고려
- [ ] DB 복원 전 영향 범위(최근 쓰기 데이터 손실) 팀 승인
- [ ] 복원 후 앱 재배포 및 캐시 퍼지

주의:
- 컬럼 추가는 일반적으로 백워드 호환성에 문제 없음. DB 복원은 최후 수단으로만 사용.

---

## 운영 반영 시 주의점(핵심 규칙)
- [ ] 대표이미지 우선순위 (서버/프론트 일치)
  1. coverImageKey가 가리키는 imageN (예: "image2")
  2. image1
  3. 기존 imageUrl / thumb
  4. candidates / 기타 fallback
- [ ] `cover_image_key` 값이 "image1".."image4" 외 값이면 무시하고 fallback 적용(서버에서 whitelist 필터링 권장)
- [ ] 선택된 imageN이 비어 있으면 즉시 fallback
- [ ] 캐시 무효화 절차 필수
- [ ] backend/data/articles.json(로컬 테스트 파일)은 절대 커밋·푸시 대상 아님

---

## 아직 미실행된 검증(보류)
- [ ] 실제 Admin 로그인 E2E(브라우저 자동화) — 보류(계정 미제공)
- [ ] Supabase(운영 DB)에서의 쓰기/읽기 실검증 — 보류(승인 필요)

---

## 남은 리스크
- Admin UI 실제 로그인 E2E 미실행(사용자 흐름의 최종 확인 필요)
- Supabase 실 DB 쓰기 검증 미실행(운영 환경 차이 가능)
- 현재 검증은 로컬 legacy JSON 중심으로 수행됨(운영/스테이징과 환경 차이 존재)

---

### 부록: 빠른 확인 쿼리 (스테이징에서 실행)
- [ ] 컬럼 존재 확인:
```sql
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='cover_image_key';
```
- [ ] cover_image_key가 설정된 샘플 조회:
```sql
SELECT id, title, cover_image_key, image1, image2, image3, image4 FROM public.articles WHERE cover_image_key IS NOT NULL ORDER BY id DESC LIMIT 10;
```
# cover_image_key 마이그레이션 & 운영 반영 체크리스트

목적: 운영 DB(Postgres/Supabase)에 `cover_image_key` 칼럼을 안전하게 추가하고, 서버·관리자 UI·퍼블릭 API가 일관되게 동작하도록 반영하는 절차와 롤백·리스크를 정리합니다.

---

## 1) 마이그레이션 SQL (초안)
- 설명: 컬럼은 NULL 허용하여 하위호환 유지. 값은 "image1" | "image2" | "image3" | "image4" 또는 NULL/빈 문자열.

```sql
-- 트랜잭션으로 안전하게 적용 (Postgres / Supabase)
BEGIN;

ALTER TABLE public.articles
  ADD COLUMN cover_image_key text;

-- (선택) 엄격한 허용값 체크 제약 (추가 시 쓰기 영향 고려)
-- ALTER TABLE public.articles
--   ADD CONSTRAINT chk_cover_image_key_allowed
--   CHECK (cover_image_key IS NULL OR cover_image_key IN ('image1','image2','image3','image4'));

-- (선택) 인덱스: 읽기 빈도가 높으면 고려 (쓰기 성능 영향 있음)
-- CREATE INDEX IF NOT EXISTS idx_articles_cover_image_key ON public.articles (cover_image_key);

COMMIT;
```

- NULL 허용 여부: 위 SQL 예시는 NULL 허용. 운영 하위호환을 위해 반드시 NULL 허용으로 적용 권장.

---

## 2) 배포(운영 반영) 체크리스트 — 순서와 자세한 수행 항목

사전 준비
- 배포(maintenance) 윈도우 예약.
- DB 스냅샷(또는 백업) 생성 — 백업 ID 기록.
- 스테이징 환경에서 동일 마이그레이션 적용 및 애플리케이션 연동 검증(권장).
- articles.json 등의 로컬 테스트 데이터는 절대 커밋·배포 대상 아님(아래에 명시).

DB 반영
1. 운영 DB 백업(스냅샷) 확인.
2. 마이그레이션 SQL 실행(트랜잭션 사용).
3. 컬럼 존재 확인: SELECT column_name FROM information_schema.columns WHERE table_name='articles' AND column_name='cover_image_key';
4. (선택) CHECK 제약/인덱스는 별도 단계로 적용하여 쓰기 영향 최소화.

서버(애플리케이션) 반영
1. 서버 코드를 배포(새 코드가 `cover_image_key`를 읽고 쓰도록 준비되어 있어야 함).
2. 롤링/블루그린 배포 권장(무중단).
3. 서버 로그·에러 모니터링 활성화.

관리자(작성폼) 확인 (기능적 검증)
1. 샘플 기사 작성: POST /api/articles (payload에 coverImageKey 포함) — (테스트 계정 또는 스테이징)
2. 수정 재진입: GET /api/articles/:id 응답에서 coverImageKey가 반환되는지 확인.
3. 선택 변경: PATCH /api/articles/:id 로 coverImageKey 변경 후 GET 재확인.
4. 선택 해제: PATCH로 빈값('' 또는 null) 전송 후 DB 컬럼이 비워지는지 확인.
(참고) 실제 브라우저 로그인 E2E는 별도 승인 시 수행.

홈·리스트·히어로 확인
1. GET /api/articles/public/list — primaryImage/thumb/imageUrl/image_url 네 키가 canonical 동일 URL로 내려오는지 확인.
2. GET /api/articles/public/latest?hero=1 — 히어로 JSON에서 동일한지 확인.
3. GET /api/home — bundle 내 latestArticles/popularArticles 반영 확인.
4. 메인 최신기사 실화면(브라우저)에서 대표이미지 시각 확인(스크린샷).

캐시 무효화 및 확인
1. 애플리케이션 내부 캐시 무효화 (invalidateArticleDerivedCaches, bumpMainArticleListCache 등) 호출.
2. CDN/edge 캐시가 있으면 해당 경로 수동 퍼지(purge).
3. 캐시 무효화 후 API 재조회로 반영 확인(헤더·내용 검사).

배포 완료 후 모니터링
- 에러 로그(5xx), API 응답 크기/타이밍, 이미지 누락 건수 모니터링(1-2시간 집중).

---

## 3) 롤백 체크리스트

가. 애플리케이션(코드) 롤백(우선)
1. 새 코드에서 문제 발생 시 우선 애플리케이션을 이전(검증된) 리비전으로 롤백.
2. 롤백 후 서비스 정상성(읽기·쓰기) 확인.

나. DB 복원(최후 수단)
1. 애플리케이션 롤백으로 해결되지 않을 때만 DB 스냅샷 복원 고려.
2. DB 복원은 최근 쓰기 데이터 손실 가능하므로 사전 승인·커뮤니케이션 필요.
3. 복원 후 앱 재배포 및 캐시 퍼지.

다. 롤백 주의사항
- 컬럼 추가는 일반적으로 안전(기존 코드가 컬럼을 무시함). 따라서 대부분의 문제는 앱 롤백으로 해결 가능.
- DB 복원 전 팀과 영향 범위를 반드시 협의.

---

## 4) 남은 리스크 및 운영 시 주의사항

1. 하위호환
- NULL 허용으로 기존 글은 영향 없음. 서버는 cover_image_key가 NULL일 경우 기존 우선순위(image1 → imageUrl/thumb → candidates)을 사용하도록 되어 있음.

2. 입력값 검증
- 운영에서 `cover_image_key` 값이 "image1".."image4" 외인 경우 **무시**하고 fallback 적용 필요(서버 측 필터링 권장).
- 사용자가 선택한 imageN이 비어 있으면(예: image2 선택 후 image2 삭제) 서버는 fallback 규칙으로 회귀해야 함(이미 로직에 포함됨). 권장: 클라이언트에서 이미지 삭제 시 cover 비우기 처리.

3. 캐시 동기화 문제
- CDN/edge·애플리케이션 캐시 TTL로 인해 반영 지연 발생 가능. 배포 절차에 캐시 퍼지 항목을 반드시 포함.

4. 미실행된 검증(보류된 항목)
- 실제 Admin 로그인 E2E(브라우저) 자동화 — 보류(계정 미제공).
- Supabase 모드에서의 쓰기·읽기(운영 DB) 검증 — 보류(승인 필요).

5. articles.json 테스트 데이터
- 로컬 backend/data/articles.json에 대한 모든 변경은 **검증용**이며, 절대 커밋·푸시 대상이 아님. 운영 반영 시 이 파일은 무시하고 Supabase(운영 DB) 마이그레이션 및 읽기/쓰기를 수행해야 함.

6. 권장 추가 개선
- 서버 응답에서 `primaryImage`와 함께 `coverImageKeyInvalid` 같은 플래그를 반환하여, 클라이언트(UI)가 선택 무효화(예: 선택된 image가 비어있음)를 명확히 알 수 있게 하면 UX 개선에 도움이 됨.
- 백필 정책: 기존 기사 중 `cover_image_key`를 일괄 채우려면 별도 검토(우선순위 규칙, 데이터량, 롤백 계획) 필요.

---

## 부록: 빠른 확인 명령 예시 (운영에서 사용 전 스테이징에서 검증)
- 컬럼 존재 확인:
```sql
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='cover_image_key';
```
- 간단한 조회(cover_image_key가 설정된 최근 글):
```sql
SELECT id, title, cover_image_key, image1, image2, image3, image4 FROM public.articles WHERE cover_image_key IS NOT NULL ORDER BY id DESC LIMIT 10;
```

---

문서 작성 완료했습니다. 이 문서를 저장(파일 생성)해 두었으며, 원하시면 추가로 Markdown 포맷 수정(예: 운영팀 배포 템플릿, 체크박스 리스트)해 드립니다. 어떤 포맷을 원하시나요? (현재 파일: `docs/cover_image_key_migration.md`)
