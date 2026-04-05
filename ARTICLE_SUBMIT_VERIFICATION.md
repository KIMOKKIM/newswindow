# 기사 송고 재검증 (운영, 커밋 `316dd9e` 배포 후)

## 1. Vercel 경로 413 재현 (변경 없음)

- `node scripts/article-submit-large-payload-test.js` → `postStatus: 413`, `FUNCTION_PAYLOAD_TOO_LARGE`

## 2. Render 직접 대용량 201

- Vercel 로그인으로 받은 JWT로 `node scripts/article-submit-render-large.js` → `postStatus: 201`

## 3. CORS (브라우저가 Render로 POST 가능 여부)

- 배포 후: `curl -X OPTIONS https://newswindow-backend.onrender.com/api/articles -H "Origin: https://www.newswindow.kr" -H "Access-Control-Request-Method: POST"`
- 응답: **`access-control-allow-origin: https://www.newswindow.kr`**

## 4. 기자 목록 반영 (Vercel `/api/articles`)

- `node scripts/article-list-vercel.js` → `listStatus: 200`, 목록에 신규 기사 `id` (예: 16) 포함

## 5. 브라우저·스크린샷

- `docs/screenshots/reporter-submit-success.png` 등은 **이 환경에서 촬영하지 않음**. 배포 반영 후 실제 브라우저에서 송고 1회로 보완 가능.

## 요약

- **원인:** Vercel 요청 본문 한도.
- **조치:** `article-write.html` 만 Render API 사용 + `server.js` 에 프로덕션 Origin CORS 허용.
