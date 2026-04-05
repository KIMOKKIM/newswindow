# 기사 상태·API 필터 매트릭스

| API | 메서드·경로 | 데이터 소스 | 상태 필터 | 정렬 | 이번 장애와의 관련 |
|-----|-------------|------------|-----------|------|---------------------|
| 공개 목록(메인) | `GET /api/articles/public/list` | `articles` 메모리 배열 | `isPublicFeedReadableStatus` ≡ **게시·송고** | `sortTimeMainFeed` 내림차순 | 모달이 노출하는 id의 “허용 집합” 정의 |
| 공개 상세(모달) | `GET /api/articles/public/:id` | 동일 배열 `rawRecord` | **동일** `isPublicFeedReadableStatus` | — | 기존에도 동일 조건이었으나, **단일 함수로 고정**해 기준 이탈 방지 |
| 기자 목록 | `GET /api/articles` + JWT `reporter` | 동일 배열 `findByAuthor` | **본인 `author_id`** + (수정 후) **`author_id` 없고 작성자명·게시·송고 일치** | `reverse()` 삽입 순 | `author_id` 누락 시 메인에만 보이던 불일치 완화 |
| 편집장·관리자 목록 | `GET /api/articles` + `editor_in_chief` / `admin` | `articlesDb.all()` | **상태 필터 없음**(전체) | `reverse()` | 목록이 비면 저장소·응답·클라이언트 쪽 이슈 우선 |

### 참고

- 저장 상태 정규화: `canonicalStoreStatus` / API `toApiStatus` (`pending`→`submitted`, `approved`→`published` 등).
- 전체기사 페이지 `public/page`·인기 `public/popular` 는 **published 만** (메인 히어로와 다름).
