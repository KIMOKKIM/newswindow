# 기자 송고 요청 추적 (운영)

## 기사 작성 화면 URL

- `https://www.newswindow.kr/nw-office/article-write.html`
- 수정 모드: `.../article-write.html?id=<숫자>`

## “송고” 버튼 동작 (`nw-office/article-write.html`)

- **이벤트:** `#btnSubmit` → `saveArticle('pending', { redirectToDashboard: true })`
- **신규 기사:**  
  - **메서드:** `POST`  
  - **URL (수정 전):** `https://www.newswindow.kr/api/articles` (동일 출처 `/api/articles`)  
  - **URL (수정 후):** `https://newswindow-backend.onrender.com/api/articles` (운영 호스트 `www.newswindow.kr` / `newswindow.kr` 에서만)
- **수정 기사:** `PATCH` `.../api/articles/{editId}` (동일 규칙)
- **헤더:** `Content-Type: application/json`, `Authorization: Bearer <localStorage accessToken>`
- **본문:** `getFormDataWithImages()` — `title`, `subtitle`, `category`, `content1~3`, `image1~3`(base64 data URL 또는 빈 문자열), 캡션, **`status`** (송고 시 `pending`)

### Payload 예시 (필드 구조)

```json
{
  "title": "…",
  "subtitle": "",
  "category": "통신",
  "content1": "…",
  "content2": "",
  "content3": "",
  "image1": "",
  "image2": "",
  "image3": "",
  "image1_caption": "",
  "image2_caption": "",
  "image3_caption": "",
  "status": "pending"
}
```

(이미지 첨부 시 `image1` 등이 매우 큰 base64 문자열이 됨)

## “저장 실패”가 뜨는 프론트 조건

```395:397:nw-office/article-write.html
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { window.location.href = 'login.html?role=reporter'; return; }
        if (!res.ok) { showErr(data.error || '저장 실패'); return; }
```

- **`!res.ok`** 인 모든 응답에서 서버가 준 `data.error` 없으면 문구 **「저장 실패」**.
- **서버 판정** (HTTP 4xx/5xx)이 원인이어도 위와 같이 표시됨.

## 운영에서 관측한 실패 응답 (이미지 포함 대용량 body)

- **경로:** `POST https://www.newswindow.kr/api/articles` (Vercel 서버리스 프록시)
- **상태:** **413**
- **본문 (일부):** `Request Entity Too Large` / `FUNCTION_PAYLOAD_TOO_LARGE`
- **스크립트:** `scripts/article-submit-large-payload-test.js` (~4.6MB JSON)

소형 본문(이미지 없음)은 동일 경로에서 **201** 확인: `scripts/article-submit-prod-test.js`.

## 쿠키

- 송고 요청에 **쿠키 미사용**; JWT만 `Authorization` 헤더.
