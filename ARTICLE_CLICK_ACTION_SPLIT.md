# ARTICLE_CLICK_ACTION_SPLIT

## 함수 분리

| 역할 | 함수 | 설명 |
|------|------|------|
| 리스트/히어로 **active·히어로 미리보기** | `show(i)` (클로저) | `nwLatestTop5Sync.goTo(i)`로 외부에서 호출 가능 |
| **상세 데이터** | `nwOpenArticleDetail(id)` | `fetch` 후 `#nwArticleDetailBody` 렌더 |
| 클릭 직후 동기화 | `nwSyncLatestTop5UiIfInTop5(id)` | Top5에 있으면 `goTo`만 호출; 없으면 무시 |

## 클릭 한 번의 순서

1. `document` capture: `a.public-article-link` → `preventDefault`.
2. `nwOpenArticleDetail(id)` 진입.
3. `nwSyncLatestTop5UiIfInTop5(id)` → (해당 시) `idx` 갱신 + `show(i)` — **롤링 타이머와 별도의 단순 UI 동기화**.
4. `fetch` → 패널에 전체 본문 렌더.

## 금지 혼동

- `show(i)`만으로 본문을 채우지 않음(API 미호출).
- `nwOpenArticleDetail`가 active를 바꾸지 않고 본문만 채우지는 않음(Top5에 한해 `goTo`로 active 정렬).
