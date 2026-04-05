# ARTICLE_META_DISPLAY_RULES

## 적용 범위

- **`displayCategory(raw)`** = `formatCategoryLabel(cleanBrokenKoreanText(raw, '뉴스'))`  
  - 기사 **상세 패널** 메타  
  - **최신기사** 우측 리스트 메타 · 좌측 히어로 메타  
  - **헤드라인** 메인·사이드 메타  
- 섹션 **그룹 키**(`majorCategory`)는 변경 없음.

## 규칙

| 조건 (trim 후 문자열 일치) | 화면 표시 |
|----------------------------|-----------|
| `category === "경제-금융"` | `금융` |
| `author_name === "김기목"` | `김기목 기자` |

## 그 외

- 위에 해당하지 않으면 **입력 문자열 그대로** (빈 값 처리 전 기본값 `뉴스` / `기자`는 기존과 동일하게 `format*`에 넘기기 전에 적용).

## 저장소

- **비변경**: API·DB의 `category`, `author_name` 필드는 수정하지 않는다.
