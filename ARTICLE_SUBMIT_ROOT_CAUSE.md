# 저장 실패 원인 (1개로 확정)

**분류:** Vercel 서버리스 **요청 본문 크기 한도 초과**로 인한 **HTTP 413** (`FUNCTION_PAYLOAD_TOO_LARGE`).

- 근거: 동일 계정·동일 토큰으로 **소형** `POST /api/articles` 는 Vercel·Render 모두 **201** (`scripts/article-submit-prod-test.js`).
- **약 4.6MB** JSON `POST https://www.newswindow.kr/api/articles` 는 **413** 및 `FUNCTION_PAYLOAD_TOO_LARGE` (`scripts/article-submit-large-payload-test.js`).
- 포토 1~3장을 base64로 넣으면 본문이 쉽게 수 MB를 넘겨 Vercel 한도에 걸림.

다음 항목은 **본 케이스가 아님** (소형 요청·직접 검증으로 반증 또는 부수적):

- 인증 토큰 미전달 / role 부족 → 소형 POST 201  
- 프록시 **응답** body 손실 → 기사 POST는 과거 이슈와 달리 **응답** 문제가 아니라 **요청** 413  
- 백엔드 저장 로직 실패(Render) → 동일 페이로드를 **Render 직접**에 붙이면 **201** (`scripts/article-submit-render-large.js`)
