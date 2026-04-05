# 메타 미리보기 ↔ 메인 상세 동기화 검증

## 자동 확인 (이 저장소에서 수행)

| 검증 | 결과 |
|------|------|
| `admin/` `npm run build` | 성공 (shared `articleMetaFormat.js` import 포함) |
| 정적 서버에서 `GET /shared/articleCategories.json` | 200, JSON |
| 로컬 API `http://127.0.0.1:3000` | 기존 프로세스 기준 기사 목록 응답 (개발 DB) |

## 수동 UI 확인 항목 (동일 기사로 비교)

1. Admin **기사 미리보기** (`/admin/article/:id/preview`)  
2. 메인 **기사 클릭 → 인라인 상세**

다음이 **동일**해야 함.

- 카테고리 짧은 이름 (예: 저장 `경제-금융` → 표시 `금융`)
- 기자 줄 (예: `김기목` → `김기목 기자`)
- `발행일` / `수정일` 레이블 및 `YYYY-MM-DD`
- 카테고리(좌) / 바이라인(우) 배치

## 스크린샷

요청 경로: `docs/screenshots/preview-meta-match.png`, `docs/screenshots/detail-meta-match.png`  
이 환경에서는 브라우저 캡처를 저장하지 않았습니다. 배포/로컬에서 촬영해 위 경로에 넣으면 됩니다.

## 참고

운영(`www.newswindow.kr`) 반영 여부는 **해당 배포 파이프라인**으로 `script.js` / `styles.css` / `public/shared/articleCategories.json` 동기화 후 재확인이 필요합니다.
