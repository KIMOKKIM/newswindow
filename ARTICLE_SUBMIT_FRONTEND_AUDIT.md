# 기사 송고 프론트 감사 (`nw-office/article-write.html`)

## 성공 판정

- `fetch` 후 **`res.ok`** (2xx) 이면 성공.
- `res.json().catch(() => ({}))` — 본문이 JSON이 아니면 `data` 가 `{}` 가 되어도 **2xx면** 이후 분기는 진행 (문제 시 주로 `!res.ok`).

## 신규 기사 + 송고 후 분기

- `!editId` 이고 `status === 'pending'` 이면 `window.location.search = '?id=' + data.id` 실행 (**201 응답에 `id` 필요** — 백엔드 `insert` 반환에 포함됨).
- 이어서 `opts.redirectToDashboard` 이면 알림 후 `reporter.html` 로 이동 (신규 글의 경우 위에서 이미 URL이 바뀌어 **페이지 리로드**가 먼저 일어날 수 있음 — UX 순서 이슈는 별개).

## 서버 응답 vs 기대

- **POST 성공:** 서버는 **전체 기사 객체** 반환 — `id` 포함 → 프론트 기대와 일치.
- **PATCH (기자):** `{ message: '수정되었습니다.' }` 만 반환 — `id` 없음. 신규가 아닌 수정 송고에서는 `editId` 가 있어 `data.id` 불필요.

## “저장 실패”

- **413** 등으로 `res.ok` 가 거짓이면 `data.error` 없을 때 **「저장 실패」** 표시 — 본 이슈와 일치.

## 수정 후 API 베이스

- 운영 호스트에서 **`API_ROOT` = `https://newswindow-backend.onrender.com/api`** 로 두어 대용량 JSON이 **Vercel 함수를 거치지 않음**.
