> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 클릭한 기사 실체·상태 감사

## API·UI 메시지 정정

- 모달이 `GET /api/articles/public/:id` 실패 시 표시하는 문구는 백엔드 **`error` 필드 그대로**이다.
- 현재 배포 코드의 403 응답 문구는 **`공개된 기사만 조회할 수 있습니다.`** (코드 내 문자열 기준).  
  사용자 화면에서 “게시된 기사만…”으로 **기억·인용이 달라질 수 있음**.

## 운영 저장소와 목록·상세 일관성 (점검 방법)

1. 브라우저 개발자 도구에서 메인이 호출한 **`GET .../api/articles/public/list`** 응답에서 클릭한 행의 **`id`**, **`status`** 를 기록한다.
2. 동일 오리진으로 **`GET .../api/articles/public/{id}`** 를 호출한다.
   - **200**: 레코드 존재 + `isPublicFeedReadableStatus` 통과(게시·송고).
   - **403** + 위 메시지: 동일 저장소에서 해당 id 의 **`status` 가 draft/rejected 등**으로 **공개 피드 밖**이거나, 목록이 **구버전 캐시**인 경우.
   - **404**: id 가 저장소에 없음.
3. 기자/편집장 대시보드는 **`GET /api/articles`** (인증)로 같은 배열을 본다.

## `author_id` 누락 레거시 기사

- JSON 상 `author_id` 가 없고 `author_name`·`status`만 있는 행은 **메인 목록에는 포함**될 수 있으나, 예전에는 기자 **`GET/PATCH /api/articles/:id`** 가 `authorIdForArticle == null` 이면 **곧바로 404** 처리되어 “목록에는 있는데 상세·수정 불가”가 될 수 있었다.
- 이번 수정으로 **작성자명 + 공개 피드 상태**가 JWT `name` 과 맞으면 기자 상세·수정이 가능하다.

## 특정 id 를 사용자가 제공하지 않은 경우

- “클릭한 기사 id” 는 **실측 시 네트워크 탭의 list 응답·모달 요청 URL**에서만 확정 가능하다.  
  본 문서는 **재현·점검 절차**를 정의한다.
