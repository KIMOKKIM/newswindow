# 메인 상단 “최신기사 5개” 롤링 규칙

## 데이터 소스

- `GET /api/articles/public/list` 응답 배열과 **동일** 목록에서 클라이언트가 상위 5개만 사용.

## 포함 상태

- **`published`(게시)** 및 **`submitted`(송고)** 만 포함.  
- **`draft`**, **`rejected`** 제외.

## 정렬(최신순)

백엔드 `listPublishedForMain`과 프론트 `sortByLatest` 모두 아래 시각 기준 내림차순에 맞춤:

1. `published_at`
2. 그다음 `submitted_at`
3. 그다음 `updated_at`
4. 그다음 `created_at`

## 개수

- 최대 **5개** 롤링.
- 전체가 5보다 적으면 **있는 만큼만** 표시.
- **0개**: 롤링 영역 숨김(`display: none`).
- **1개**: 롤 고정, 인터벌 없음.
- **2개 이상**: **3초**마다 다음 슬롯으로 순환.

## 슬롯에 표시하는 필드

- **제목** (`title`)
- **카테고리** (`category` 문자열 그대로; 메인 기사 메타와 동일)
- **기자명** (`author_name`)
- **날짜 한 줄**: `published_at || submitted_at || created_at`의 `toDate()` (기존 헬퍼)
- **썸네일**: API의 `thumb`(서버에서 URL형 `image1`만; base64 제외)
- **링크**: `publicArticleHref(id)` → `/article.html?id=…`

## 헤드라인 영역과의 관계

- 동일 fetch 결과로 `renderHeadlineFromPublished` + `renderTop5RotatorFromList` 호출 → **동일 저장소·동일 목록** 기반.
