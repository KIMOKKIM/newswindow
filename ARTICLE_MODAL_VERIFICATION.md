# 메인 기사 모달 검증 체크리스트

## 운영(배포 후)

1. **최신기사** 우측 리스트 제목 클릭 → `article.html` 로 이동하지 않음, 모달 표시, 본문·메타·이미지 확인.
2. **히어로**(이미지/제목 영역) 클릭 → 동일.
3. **카테고리 섹션** API로 채워진 제목 링크 클릭 → 동일.
4. 닫기 / 배경 / ESC 동작, 스크롤 잠금 해제.
5. 새로고침 후 광고·롤링·히어로 타이머 정상.
6. `https://www.newswindow.kr/article.html?id=1` 등 **직접 URL**은 본 작업에서 수정하지 않았으므로, 기존 원인( API 베이스 불일치 )대로 실패할 수 있음 — 메인 플로우는 모달로 우회.

## 증거(선택)

- `docs/screenshots/article-modal-open.png`
- `docs/screenshots/article-modal-content.png`
- `docs/screenshots/article-modal-close.png`

## 사전 관측

- 운영 `article.html?id=1` 응답 본문에 「기사 로드 실패」 문구 확인됨(정적 페이지 + 상대 `/api` 가정).
