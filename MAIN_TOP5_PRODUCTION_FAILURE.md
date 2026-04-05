# 메인 최신기사·롤링 운영 미노출 — 원인 확정

## 운영에서 확인한 사실

1. **메인이 호출하는 기사 API (기존 `script.js` 기준)**  
   - `ARTICLES_API = NW_CONFIG_API_ORIGIN || ADS_API`  
   - `ADS_API = API_ORIGIN`  
   - `www.newswindow.kr`에서 `window.NW_API_ORIGIN`이 주입되지 않은 배포본에서는 `API_ORIGIN === ''` → 요청 URL은 **동일 오리진** `https://www.newswindow.kr/api/articles/public/list`.

2. **`NW_API_ORIGIN` 주입**  
   - `scripts/vercel-build.mjs`는 `PUBLIC_UPLOAD_ORIGIN` 또는 `BACKEND_PUBLIC_URL`이 빌드 환경에 있을 때만 `index.html`에 `NW_API_ORIGIN`을 넣는다.  
   - 운영 `index.html` 일부 배포본에서는 해당 스니펫이 없거나 빈 값만 있는 상태로 관찰되었다.

3. **`/api/articles/public/list` 응답 (www 기준)**  
   - `Invoke-WebRequest https://www.newswindow.kr/api/articles/public/list` → **HTTP 404** (Vercel 정적 사이트에 Express 라우트 없음).

4. **실제 기사 API (백엔드)**  
   - `https://newswindow-backend.onrender.com/api/articles/public/list` → **200**, JSON 배열 (검증 시 다수 건).

5. **`script.js` 렌더**  
   - `fetch`가 실패하면 `.catch`에서 `renderTop5RotatorFromList([])`만 호출·로그 없음 → 롤링 섹션 숨김, 헤드라인·섹션도 갱신 안 됨.  
   - 운영 HTML이 구버전이면 `#nwTop5Rotator` 자체가 없어 `getElementById` 실패 시 조기 return → 롤링 UI 없음 (데이터와 무관).

## 직접 원인 요약

- **최신기사 미노출**: 메인 페이지가 **프론트 호스트(www)** 로 `GET /api/articles/public/list`를 보내 **404**가 나며, 공개 기사 배열을 받지 못함.  
- **롤링 미동작**: 위 실패로 리스트가 비어 `renderTop5RotatorFromList`가 빈 배열 처리하거나, 구 HTML에서 **`#nwTop5Rotator` 부재**로 함수가 즉시 return함. `setInterval` 자체 버그가 아니라 **데이터·DOM 전제 실패**.

## 조치 (코드)

- `script.js`: `www.newswindow.kr` / `newswindow.kr`에서 `API_ORIGIN`을 `https://newswindow-backend.onrender.com`으로 고정해 `ARTICLES_API`·`/api/ads`가 동일 백엔드를 향하도록 함.  
- `script.js`: `#nwTop5Rotator`가 없을 때 `main` 앞에 동일 마크업을 삽입하는 `ensureNwTop5RotatorSection()` 추가.

배포 후 네트워크 탭에서 `newswindow-backend.onrender.com/api/articles/public/list` 호출 및 200 확인 권장.
