# 메인 기사 상세 메타 렌더링 위치

## 위치

| 항목 | 파일 / 심볼 |
|------|-------------|
| 인라인 상세 패널 HTML 생성 | 루트 `script.js`, 동일 내용 `public/script.js` — `nwBuildArticleDetailHtml(a)` |
| 목록·카드에 보이는 카테고리 줄 | 같은 파일 — `displayCategory(raw)` |

## 데이터 출처 (변경 없음)

`nwOpenArticleDetail` 등에서 `GET /api/articles/public/:id` (또는 동일 형태의 공개 단건 응답)의 객체 `a`를 그대로 사용.

| 표시 | 필드 |
|------|------|
| 카테고리 표시 | `a.category` (표시만 `cleanBrokenKoreanText` 후 매핑) |
| 기자 | `a.author_name` |
| 발행일 원본 | `a.published_at` 있으면 그것, 없으면 `a.created_at` |
| 수정일 원본 | `a.updated_at` 있으면 그것, 없으면 `a.created_at` |

## 과거 불일치 원인

- 상세 메타가 **`formatCategoryLabel` / `formatAuthorLabel`**에 예시 값만 하드코딩되어, JSON 매핑·`reporterDisplayName` 규칙과 다름.
- 날짜가 **`nwModalFormatTs`**로 짧게 잘린 타임스탬프 + 문구 `발행`/`수정` 형태여서, 미리보기의 `발행일`/`수정일` + `YYYY-MM-DD` 와 불일치.

## 현재 (통일 후)

- `nwLoadCategoryMap` → `fetch('shared/articleCategories.json')` 후 `nwCategoryLabelForValue` (알고리즘은 `articleMetaFormat.js`의 맵과 동일).
- 기자·날짜는 `nwReporterDisplayName`, `nwFormatArticleMetaDateYmd`로 미리보기와 동일한 문자열 조합.
- 마크업: `nw-article-detail__meta--preview` + `meta-cat` / `meta-byline` (`articlePreview`의 flex 메타 바와 대응).
