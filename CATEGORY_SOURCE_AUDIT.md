> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 카테고리 원본 추적 (코드 기준)

## 메인페이지 카테고리 목록이 정의되는 곳

1. **시각·정보 구조(원본 UI)**  
   - `index.html`(동일 내용은 `public/index.html` 배포 복사본에 존재 가능)  
   - `<nav class="nav">` 드롭다운 + 메인 컬럼 `<section class="news-section">`의 `.section-subcats`  
   - 즉 **HTML에 고정된 트리**: 대분류(정치, 경제, …) × 소분류(최신기사, 지방자치, …).

2. **기사를 섹션에 넣을 때 쓰는 규칙**  
   - `script.js` / `public/script.js`의 `majorCategory(cat)`  
   - `String(cat).split('-')[0].trim()` → 저장값이 `정치-최신뉴스` 형이면 대분류는 `정치`.  
   - DOM의 `.section-title` 텍스트와 이 대분류 문자열이 매칭되어 기사가 섹션 리스트에 채워짐.

3. **API/localStorage**  
   - 메인은 카테고리 **목록 API를 쓰지 않음**. 기사 목록만 API로 받고, 위 규칙으로 묶음.

## 기사 작성(신규 admin) 대시보드가 카테고리를 가져오던 곳 (수정 전)

- `admin/src/data/categories.js`의 하드코딩 배열 `CATEGORY_OPTIONS`  
- `admin/src/pages/articleForm.js` → `categorySelectHtml()`로 `<select>` 생성.

## 두 곳의 관계 (수정 전)

- **서로 다른 source**: 메인은 `index.html` + `majorCategory` 규칙, admin은 **축약된** JS 배열.  
- **같은 source가 아니었음.**

## 일부만 보인 직접 원인 (확정)

- **하드코딩 누락**: admin 배열이 `nw-office/article-write.html`·메인 HTML에 있는 소분류 전부를 포함하지 않았음 (예: 정치-외교·북한, 경제-부동산·자동차, 사회 추가 항목, 문화 추가 항목, 전국 지역 전부, 이슈 뷰티·여행 등).  
- 필터링·role 분기·API 축소·렌더 개수 제한 **아님**.

## 수정 후 source of truth

- `shared/articleCategories.json` — 메인 `index.html`의 네비·섹션 하위 분류와 1:1 대응하는 값/라벨.  
- `admin/src/data/categories.js`는 해당 JSON만 읽어 옵션을 생성(중복 배열 제거).
