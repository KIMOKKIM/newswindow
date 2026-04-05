# 최신기사 섹션 실패 — 직접 원인 1개

## 확정 원인

**루트 `script.js`의 `displayCategory`가 제거된 `formatCategoryLabel`을 호출**하고 있었다.

- `renderLatestTop5FromList`에서 `displayCategory(row.category)` 호출 시 **`ReferenceError`**.
- 함수 내부 `try/catch`가 이를 잡아 Top5 영역만 오류 문구로 덮음.
- 이후 `renderSectionListsByCategory`는 `displayCategory`를 쓰지 않아, 같은 API 성공이라면 **카테고리 섹션만 갱신**되거나, 실패 시에는 HTML **정적 플레이스홀더**가 남아 “일부 목록은 보인다”와 혼동되기 쉬움.

## 해당하지 않는 가설(이번 코드 기준)

- 최신기사 전용 다른 API 사용: 아님(동일 `/public/list`).
- API origin이 카테고리와 다름: 아님(같은 fetch).
- 송고/게시 status가 아예 필터에 안 들어감: 백엔드는 `submitted`/`published` 포함;  
  다만 **렌더 예외**로 Top5에 그리지 못한 것이 증상과 일치.

## 수정

- `displayCategory` → `nwCategoryLabelForValue(cleanBrokenKoreanText(raw, '뉴스'))`  
  (`public/script.js`와 동일, 메타 통일 시 의도된 구현)
