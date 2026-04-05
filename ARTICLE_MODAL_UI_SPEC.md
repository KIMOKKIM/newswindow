# 메인 기사 모달 UI 사양

## 위치·구조

- `#nwArticleModal`: `position: fixed; inset: 0;` 전체 덮개, 모바일은 하단 시트(`align-items: flex-end`), 데스크톱은 중앙 정렬.
- 자식: `.nw-article-modal__backdrop`(dim), `.nw-article-modal__dialog`(콘텐츠, `role="dialog"`).
- 단일 인스턴스 재사용; 본문은 `#nwArticleModalBody`.

## 표시 콘텐츠

- 제목(`h1#nwArticleModalTitle`), 부제(있을 때), 메타(카테고리·기자명·발행/수정 시각 `YYYY-MM-DD HH:mm:ss` 앞 19자 우선),
- 본문: `content1`–`content4` / 레거시 `content`( `article.html` 과 동일한 블록 순서: 본문 단락 → 이미지 → 캡션`),
- 하단 법적 문구.
- 이미지: `data:`·절대 URL·`/uploads/…`는 `NW_PUBLIC_UPLOAD_ORIGIN` 등으로 접두(목록 썸네일과 동일 계열).

## 접근성·UX

- 닫기 버튼 `aria-label="닫기"`, 다이얼로그 `aria-labelledby="nwArticleModalTitle"`.
- 열릴 때 `body`/`html` 스크롤 잠금.

## 레이아웃 영향

- 고정 `z-index`(10050)로 헤더·롤링 위에만 뜨며, 기존 섹션 DOM 구조는 변경하지 않음.
