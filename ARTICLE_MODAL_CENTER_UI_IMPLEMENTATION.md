# ARTICLE_MODAL_CENTER_UI_IMPLEMENTATION — 구현 요약

## 변경 파일

| 파일 | 내용 |
|------|------|
| `index.html` | `.nw-article-modal__dialog-inner`로 닫기+본문 래핑 (flex 컬럼 기준점). |
| `public/index.html` | 배포 정적 루트와 동일하게 동기화. |
| `script.js` | `nwModalBuildArticleHtml`: `masthead` + `article-scroll`(본문·이미지·법적고지). 로딩/오류 시 `nw-article-modal__body--plain`. |
| `public/script.js` | 동기화. |
| `styles.css` | 중앙 정렬, `max-width`/`max-height`, `dialog-inner`/masthead/scroll 분리, `body--plain`, 애니메이션·미디어쿼리. |
| `public/styles.css` | 동기화. |

## 마크업 계층

```
.nw-article-modal (fixed, flex center)
  .nw-article-modal__backdrop
  .nw-article-modal__dialog
    .nw-article-modal__dialog-inner (flex column, min-height: 0, max-height)
      button.nw-article-modal__close
      #nwArticleModalBody.nw-article-modal__body
        [.nw-article-modal__masthead] + [.nw-article-modal__article-scroll ...]
```

## 사용성

- 긴 기사: 제목·메타는 상단에 고정되고, **본문·이미지·캡션·법적 문구만** 스크롤 영역에서 읽음.
- 로딩/에러: 한 컬럼으로 메시지 표시, 패딩 일관.

## Vercel 빌드

- `scripts/vercel-build.mjs`의 `copyMainSiteIntoPublic`가 루트 `index.html`·`styles.css`·`script.js`를 `public/`에 복사하므로, **빌드 후** 프로덕션 정적 파일에 반영됨.
