# ARTICLE_MODAL_CENTER_VERIFICATION — 검증 기록

## 로컬 (자동/수동)

| 항목 | 결과 | 메모 |
|------|------|------|
| 백엔드 헬스 | OK | `GET http://127.0.0.1:3000/api/health` — 이미 포트 사용 중으로 추정, 응답 확인. |
| 공개 기사 목록 | OK | `GET /api/articles/public/list` JSON 수신. |
| 정적 HTML | OK | 루트를 `serve`로 띄운 뒤 `index.html`에 `nw-article-modal__dialog-inner` 문자열 존재 확인. |

## 운영 (https://www.newswindow.kr, 배포 반영 전 스냅샷)

| 항목 | 결과 | 메모 |
|------|------|------|
| HTML에 `dialog-inner` | **미포함** | 현재 프로덕션은 구 마크업; **배포 후 재검증 필요**. |
| 스타일/스크립트 버전 | 불명 | 프로덕션 `styles.css`/`script.js` 캐시 및 해시는 배포 파이프라인에 따름. |

## 스크린샷

- 요청 경로: `docs/screenshots/article-modal-centered.png`, `article-modal-scrollable.png`, `article-modal-header-footer-fixed.png`
- **미첨부**: 이 환경에서 브라우저 캡처 파일을 생성하지 않았음. 배포 후 수동 캡처 권장.

## 모바일

- 뷰포트 패딩·`min(80vh, 880px)`·낮은 높이 미디어쿼리로 중앙 정렬·잘림 방지 설계. 실제 단말에서는 스크롤·주소창 높이 변화를 한 번 더 확인할 것.
