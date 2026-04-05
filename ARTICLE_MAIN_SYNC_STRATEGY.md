# 기사 저장 후 메인 반영 전략

## 채택: 동일 API 재조회 + 캐시 비활성

- 메인은 페이지 **로드 시 한 번** `GET /api/articles/public/list?`에 `cache: 'no-store'`로 요청한다.
- 저장소는 단일 `articles.json`이므로, **백엔드가 쓴 직후** 다음 메인 새로고침·재방문 시 **항상 최신 배열**을 받는다.
- 별도 WebSocket·SSE·폴링 루프 **없음**(요구사항에 맞는 최소안).

## 프로덕션 전제

- 브라우저가 API를 **실제 백엔드 호스트**로 보내도록 `vercel-build`가 `window.NW_API_ORIGIN`(= `BACKEND_PUBLIC_URL` 또는 `PUBLIC_UPLOAD_ORIGIN`)을 `index.html`·`article.html`에 주입해야 한다.
- Vercel 환경 변수 미설정 시 `/api/articles/...`가 Vercel 정적 호스트로 가면 **목록이 비거나 실패**한다.

## 헤드라인·섹션·롤링

- 한 번의 fetch 결과를 나눠 쓰므로 **데이터 불일치 없음**.
