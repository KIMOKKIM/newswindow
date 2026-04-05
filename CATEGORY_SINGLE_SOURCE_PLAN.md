# 단일 source of truth — 채택안

## 선택한 방식 (1개)

**`shared/articleCategories.json`** 을 유일한 데이터 원본으로 두고, 신규 admin 기사 폼은 이 JSON만 읽어 `<option>` / `optgroup`을 생성한다.

## 이유

- 메인은 HTML에 트리가 박혀 있고 API가 없음 → “기사에 넣을 수 있는 값” 목록을 JSON으로 한 번 정리하면 백엔드·SPA가 동일 문자열을 쓰기 쉬움.  
- `nw-office/article-write.html`은 이미 동일 계열의 **전체** `<option>`을 가지고 있었고, admin만 짧은 복제본을 쓰고 있어 불일치가 났음.  
- JSON은 비개발자도 diff 하기 쉽고, 이후 메인 HTML을 바꿀 때는 **이 JSON과 index.html을 함께 고치면** 대시보드는 재빌드만으로 자동 반영.

## 적용 상태

| 소비자 | 상태 |
|--------|------|
| `admin/src/data/categories.js` | JSON import로 전환 완료 |
| `index.html` | 여전히 HTML(표시용). 메인 구조 변경 시 JSON과 함께 수정해야 완전 동기 |
| `nw-office/article-write.html` | **아직** 인라인 `<option>` 유지 → 중복 잔존 (후속 작업) |
| `script.js` | 카테고리 목록을 들고 있지 않음(`majorCategory`만). 변경 불필요 |

## 메인 변경 시 워크플로

1. `index.html`(및 `public/index.html` 등 배포 경로) 네비/섹션 수정  
2. `shared/articleCategories.json` 동일 반영  
3. `npm run build`(admin) 및 배포  
