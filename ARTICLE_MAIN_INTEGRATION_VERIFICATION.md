# 기사–메인 통합 검증 체크리스트

## 코드·로컬(백엔드 재시작 후)

1. **백엔드 재시작**: `articles.json`/코드 변경 후 기존 `node server.js` 프로세스는 메모리 스냅샷을 쓰므로 **반드시 재기동**.
2. `GET http://127.0.0.1:3000/api/articles/public/list`  
   - 응답에 **`published`·`submitted`** 혼합, **`thumb`·`submitted_at`** 필드(신규 백엔드) 포함 여부 확인.
3. id **21·22**(김기목)가 상단부에 오는지(시드 실행한 환경에서).
4. 정적 메인: 루트 `index.html` + `script.js` + `styles.css`를 브라우저에서 열고(또는 `public/` 복사본), 개발자 도구 Network에서 `public/list` 요청 성공 여부.

## 롤링 동작

- 최신 5개 슬라이드, **3초** 전환(2건 이상일 때).
- 1건만 있으면 인디케이터 1개 고정.

## 링크

- 롤링·헤드라인 링크 클릭 → `/article.html?id=…` → `GET /api/articles/public/:id` **200**(송고·게시).

## 운영(www)

- Vercel **환경 변수**: `BACKEND_PUBLIC_URL` 또는 `PUBLIC_UPLOAD_ORIGIN`에 Render(또는 API) **원본** URL 설정.
- `npm run vercel-build` 배포 산출물에 `NW_API_ORIGIN` 주입 확인( `public/index.html` `<head>` ).
- 운영 백엔드에 최신 `articles` 라우트·DB 로직 배포.
- 필요 시 운영에서 `seed-kimgimok-articles.mjs` 대신 **실제 대시보드 송고**로 동일 검증.

## 스크린샷(수동)

- `docs/screenshots/article-submit-success.png`
- `docs/screenshots/main-top5-rotator-1.png` / `main-top5-rotator-2.png`
- `docs/screenshots/test-article-kimgimok.png`

(자동 캡처는 이 작업에서 생성하지 않음.)
