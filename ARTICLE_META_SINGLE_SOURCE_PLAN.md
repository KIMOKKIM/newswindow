# 메타 표시 단일 규칙 계획

## 원칙

- **저장 데이터** (`category`, `author_name`, 타임스탬프 필드)는 **수정하지 않음**.
- **표시**만 공통 규칙으로 맞춤.
- 미리보기와 메인 상세에 **서로 다른 하드코딩 문자열**을 두지 않음.

## 계층

1. **권위 소스(로직)**: `shared/articleMetaFormat.js` + `shared/articleCategories.json`.
2. **Admin (Vite)**: 위 모듈을 `import`하여 `articlePreview.js`, `articleForm.js`, `categories.js`에서 사용.
3. **메인 (`script.js`)**: 브라우저 IIFE에서는 ES import를 쓰지 않으므로, **동일 알고리즘**을 `nwCategoryLabelForValue` / `nwReporterDisplayName` / `nwFormatArticleMetaDateYmd` + 런타임 JSON 로드로 **미러링**. 데이터 파일은 배포 시 `public/shared/articleCategories.json` (`vercel-build.mjs` 참고).

## 초기화 순서

- `DOMContentLoaded`에서 **`nwLoadCategoryMap` 완료 후** 나머지 초기화(목록 렌더 등) 실행 → 카테고리 매핑이 준비된 뒤 `displayCategory` / 상세와 일치.

## 스타일

- 메인 상세 메타 줄: `styles.css` / `public/styles.css`에 `nw-article-detail__meta--preview` 등 — `admin`의 `nw-prev-meta-bar` 레이아웃과 동일한 flex 규칙.
