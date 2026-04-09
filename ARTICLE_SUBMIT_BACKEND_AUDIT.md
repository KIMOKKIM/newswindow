> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 기사 송고 백엔드 감사

## 엔드포인트

- **Express:** `POST /api/articles` (`backend/routes/articles.js`) — 기자만 `reporter` role
- **저장소:** `backend/db/articles.js` → `data/articles.json` (파일)

## 성공 응답

- **201** + **전체 row JSON** (`id`, `title`, … 포함)

## Render vs Vercel (소형 본문)

| 경로 | 결과 |
|------|------|
| A direct Render `POST .../api/articles` | 201, 본문 정상 |
| B Vercel `POST https://www.newswindow.kr/api/articles` | 201, 본문 정상 |

## 대용량 본문

| 경로 | 결과 |
|------|------|
| Vercel B | **413** `FUNCTION_PAYLOAD_TOO_LARGE` |
| Render A (Vercel에서 발급한 동일 JWT) | **201** (예: 응답 길이 ~4.8MB — 이미지 필드 포함) |

## 결론

- 백엔드 저장 로직·DB 경로는 **소형·대형 모두 Render 기준 정상**.
- 운영 이슈는 **Vercel 함수로 들어오는 큰 POST** 에서 발생.
