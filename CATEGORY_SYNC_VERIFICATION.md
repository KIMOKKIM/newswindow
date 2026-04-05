# 카테고리 동기화 재검증

## 코드·빌드

- `shared/articleCategories.json`: 소분류 **26** + 단독 **3** = **29** value.  
- `admin`: `npm run build` 성공, JSON이 번들에 포함됨(모듈 수 20).  
- 기사 폼 `<select>`: `categorySelectHtml()`이 **optgroup(정치·경제·…)** + 하단 국제/칼럼/포토뉴스&영상.

## 항목 수

| 구분 | 개수 |
|------|------|
| 메인 페이지 소분류(선택 가능 value) | 29 |
| admin 기사 폼(동일 JSON) | 29 |
| placeholder | 각 1 |

## 순서·누락

- 수정 전 admin에 없던 18개 value가 JSON·폼에 포함됨.  
- 메인 HTML과 불일치하던 `뉴스포커스`(nw-office 전용)는 메인 기준이 아니므로 제외.

## 운영·UI 스크린샷

- `docs/screenshots/mainpage-categories.png` — 메인 네비/섹션 캡처(수동).  
- `docs/screenshots/article-dashboard-categories.png` — `/admin` 기사 작성 `<select>` 캡처(수동).  

이 저장소 작업만으로 프로덕션 URL 브라우저 캡처는 생성하지 않음.

## 신규 카테고리 추가 시

1. `index.html` 반영  
2. `shared/articleCategories.json` 에 동일 `value`/라벨 추가  
3. admin 재빌드·배포  

한 곳(JSON)만 고치면 폼은 자동 반영.
