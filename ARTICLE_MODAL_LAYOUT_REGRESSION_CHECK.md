# ARTICLE_MODAL_LAYOUT_REGRESSION_CHECK — 회귀 점검 체크리스트

## 코드·정적 점검 (저장소 기준)

- [x] `nwOpenArticleModal` / `nwCloseArticleModal` 호출 경로 유지.
- [x] `ARTICLES_API` 기반 `fetch` 유지 (더미 없음).
- [x] `article.html` 이동 없음 (`preventDefault` + 모달만).
- [x] `#nwLatestTop5`, 푸터 광고 트랙, 사이드 광고 마크업 **미변경**.

## 브라우저에서 확인할 항목

- [ ] 메인에서 공개 기사 링크 클릭 → 모달 오픈, 제목·메타·본문·이미지 표시.
- [ ] 닫기: ×, 배경, ESC.
- [ ] 최신기사 히어로/리스트 롤링·탭 동작.
- [ ] 푸터 스폰서 롤링·사이드 배너 영역 유지.
- [ ] 모달 열린 상태에서 페이지 바닥이 늘어나거나 레이아웃이 깨지지 않음.
- [ ] 긴 본문: **스크롤바가 모달 본문 구역에만** 생김.

## 운영

- 재배포 전: `https://www.newswindow.kr` HTML에 `dialog-inner` 포함 여부 확인.
- 재배포 후: 동일 확인 + 실제 클릭 스모크.
