> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 좌우 사이드 광고 API 페이로드 감사 (운영)

## 기준

- **시점:** 감사 작성 시  
- **요청:** `GET https://newswindow-backend.onrender.com/api/ads`  
- **상태:** HTTP 200

## 응답 요약 (실측)

| 필드 | 내용 |
|------|------|
| `headerLeft.src` | `./images/nonghyup-banner.png` (상대 경로) |
| `headerRight.src` | `./images/chungbuk-council-banner.png` (상대 경로) |
| `sideLeft` | `{ "src": "", "href": "#" }` |
| `sideRight` | `{ "src": "", "href": "#" }` |
| `sideLeftStack` | **4항목**, 각 `{ "src": "", "href": "#" }` |
| `sideRightStack` | **3항목**, 각 `{ "src": "", "href": "#" }` |
| `footer` | 7항목, `image` 필드 존재 — 절대 URL(`http://newswindow-backend.onrender.com/uploads/ads/...`) 및 상대 경로(`/ads/ad2.png` 등) 혼재 |

## 이미지 URL 필드

- 사이드 스택 항목: **`src` 필드는 모두 빈 문자열** (`null` 아님).
- 푸터: **`image`** 필드 사용(스키마 불일치: 사이드는 `src`, 푸터는 `image`).

## 결론

- 운영 저장소(`ads.json` 등) 기준으로 **좌우 전용 슬롯 데이터가 채워지지 않은 상태**로 조회됨.
- 푸터·헤더에는 이미지 경로가 있으나 **sideLeftStack / sideRightStack에는 표시할 URL이 없음**.

※ 코드 변경 후 `GET /api/ads`는 사이드가 전부 비었을 때 **응답 본문만** footer로 임시 보강한다(디스크 파일은 PUT 전까지 불변).
