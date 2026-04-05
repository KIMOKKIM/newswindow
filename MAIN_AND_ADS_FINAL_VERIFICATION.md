# 메인·광고 복구 후 운영 재검증

## 전제

- **프론트(Vercel)**: 최신 `script.js`·`index.html`·Admin 빌드가 배포되어야 한다.  
- 본 문서 작성 시점에 **www에 수정 전 번들이 남아 있으면** 아래 항목은 자동으로 통과하지 않는다.

## API(브라우저 외 검증)

| 검사 | URL | 기대 |
|------|-----|------|
| www (배포 전 코드) | `https://www.newswindow.kr/api/articles/public/list` | 404 (정적 호스트) |
| 백엔드 | `https://newswindow-backend.onrender.com/api/articles/public/list` | 200, JSON 배열 |
| 백엔드 | `https://newswindow-backend.onrender.com/api/ads` | 200, `footer` 등 필드 |

배포 후 DevTools Network에서 기사·광고 요청이 **`newswindow-backend.onrender.com`** 으로 나가는지 확인.

## 체크리스트 (운영)

- [ ] 메인 헤드라인·섹션이 공개 기사로 갱신되는가  
- [ ] 최신 5개 롤링 영역 노출·3초 간격 전환  
- [ ] 좌·우 사이드 광고(스택) 표시  
- [ ] 하단 롤링 배너(`footer`) 표시  
- [ ] `/admin` 광고 관리에서 기존 데이터 조회·저장  
- [ ] 새로고침 후 유지  
- [ ] 재로그인 후 유지  

## 스크린샷 (배포 후 저장 권장)

`docs/screenshots/`:

- `main-top5-visible.png`  
- `main-top5-rotating.png`  
- `main-ads-left-right.png`  
- `main-bottom-rolling-banner.png`  
- `ads-dashboard-restored.png`  

*(현재 워크스페이스에는 배포 후 캡처 없음 — Vercel/Render 반영 후 촬영.)*

## 로컬

- `http://127.0.0.1:3000` 백엔드가 떠 있으면 `script.js`의 로컬 분기로 동일 API를 사용하는지 확인 가능(호스트명 `localhost`, `API_ORIGIN → 3000`).
