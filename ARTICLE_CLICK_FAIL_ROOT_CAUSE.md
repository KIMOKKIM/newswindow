# 기사 클릭 후 `article.html` 로드 실패 — 직접 원인

## 현상

- 운영(`www.newswindow.kr`)에서 `https://www.newswindow.kr/article.html?id=…` 접속 시 화면에 **「기사 로드 실패 / 기사를 불러오지 못했습니다」** 표시(2026-04-05 웹 응답으로 재현).

## 링크 형태

- `script.js`의 `publicArticleHref`는 과거 `/article.html?id=<id>#id=<id>` 형태였다. 이는 쿼리 손실 대비용 해시이며, **`?id=16?id=16` 이중 쿼리**를 만들지는 않는다(코드 상 `encodeURIComponent` 한 번만 사용).

## `article.html`의 API 호출

- 인라인 스크립트: `fetch(API + '/api/articles/public/' + encodeURIComponent(id))` (`article.html` 83행 근처).
- `API` 결정 로직 (`article.html` 30–44행):
  1. `window.NW_API_ORIGIN`이 비어 있지 않으면 그 값 사용.
  2. 그렇지 않고 호스트가 `localhost` / `127.0.0.1` / LAN 대역이면 `http://127.0.0.1:3000`.
  3. **그 외(운영 도메인 `www.newswindow.kr` 등)** → **`''`(빈 문자열)**.

빈 문자열이면 요청 URL은 **`/api/articles/public/:id`** 가 되며, **현재 문서 오리진(`https://www.newswindow.kr`)에 대한 상대 URL**이다. 정적 프론트 호스트에는 해당 API 라우트가 없어 JSON 에러 또는 404가 나고, `res.ok`가 아니어서 사용자 메시지로 이어진다.

## 메인 `index`와의 불일치(동일 저장소인데 요청처럼만 다름)

- 메인 `script.js`의 `ARTICLES_API`는 `www.newswindow.kr` / `newswindow.kr`일 때 **`https://newswindow-backend.onrender.com` 으로 고정**(하드코딩)하여 `GET /api/articles/public/list`가 성공한다.
- `article.html`에는 동일한 운영 도메인 → Render 오리진 폴백이 **없고**, `NW_API_ORIGIN` 주입이 없거나 실패하면 위와 같이 **동일 출처 `/api`** 로 떨어진다.

## 결론 (직접 원인 1개)

**운영에서 `article.html`이 기사 API 베이스 URL을 잡지 못해(주입 없음 + 도메인 폴백 없음), `www` 호스트로 상대 경로 `/api/articles/public/:id` 요청이 나가면서 실패하는 것.**
