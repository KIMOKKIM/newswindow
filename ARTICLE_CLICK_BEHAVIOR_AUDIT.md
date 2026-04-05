# ARTICLE_CLICK_BEHAVIOR_AUDIT

## 코드 기준 사실 (script.js)

| 경로 | 캡처 리스너 | 동작 |
|------|-------------|------|
| 우측 `#nwLatestList` 안 `a.nw-latest-list__link` | `nwBindMainArticleDetail` — `document` capture | `preventDefault` → `nwOpenArticleDetail(id)` |
| 좌측 `#nwLatestHeroLink` | 동일 | 동일 (`public-article-link` + `data-public-article-id`) |
| 헤드라인·섹션·TV 등 `a.public-article-link` | 동일 | 동일 |

## 최신기사 Top5 전용 (롤링 / active)

- `renderLatestTop5FromList` 내부 **`show(i)`**: 히어로 텍스트·썸네일·도트·`li.is-active`만 갱신. **본문 API 호출 없음.**
- **3초 `setInterval`**: `show(idx)`만 호출 — 자동 카드 전환.

## 운영 증상과의 정합

- 예전 배포가 **`#nwArticleModal`만 있고 `#nwArticleDetail` 없음**이면: `nwBindMainArticleDetail`가 `shell` 없어 **즉시 return** → 캡처 핸들러가 **등록되지 않음** → `public-article-link`에 대한 `preventDefault` 없음 → 앵커 기본 동작(`href="#"`)만 실행되고, **목록 active는 타이머 `show`와 겹쳐 보이거나** 상세 영역은 비어 있음.
- 본 저장소는 **`#nwArticleDetail` + `nwOpenArticleDetail` + `nwLatestTop5Sync`** 로 위 경로를 맞춤.

## 상세 실패 UI

- `#nwArticleDetailBody` 안에만 `nw-article-detail__error` / `__errmsg` 렌더.
