# 기사 상태·API 필터 매트릭스

| API | 경로·메서드 | 데이터 소스 | 상태 필터·접근 규칙 | 정렬 | 문제와의 관련 |
|-----|-------------|-------------|---------------------|------|----------------|
| 메인 공개 목록 | `GET /api/articles/public/list` | `articles[]` | `isPublicFeedReadableStatus` → **published / submitted**(정규화 포함) | `sortTimeMainFeed` 내림차순 | 모달이 쓰는 id 집합의 출처 |
| 모달·공개 상세 | `GET /api/articles/public/:id` | 동일 | **목록과 동일** `isPublicFeedReadableStatus` | — | 불일치 시 403 + `공개된 기사만…` |
| 기자 목록 | `GET /api/articles` (reporter) | 동일 | `reporterOwnsArticleRecord`: **author_id = JWT id** 또는 **author_id 없음 + author_name = JWT name + 공개 피드 상태** | `reverse()` | 누락·불일치 완화 |
| 기자 상세·수정 | `GET/PATCH /api/articles/:id` (reporter) | 동일 | **목록과 동일한 소유 판정**(`reporterOwnsArticleRecord`) | — | 예전: `ownerId==null` → 404 로 목록과 어긋날 수 있었음 |
| 편집장·관리자 목록 | `GET /api/articles` (staff) | 동일 | **필터 없음** `all()` | `reverse()` | 한 건도 안 보이면 저장소·응답 오류·다른 API 베이스 의심 |

### 공개 피드에 포함되지 않는 상태

- **draft**, **rejected**, 기타 → `toApiStatus` 후 published/submitted 가 아니면 **메인 목록·공개 상세 모두 제외**.
