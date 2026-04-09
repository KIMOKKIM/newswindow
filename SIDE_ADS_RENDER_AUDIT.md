> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 좌우 사이드 광고 렌더링 로직 감사 (`script.js`)

## 진입점

- `DOMContentLoaded` → `fetch(ADS_API + '/api/ads')` → 성공 시 `applySideStacks(ads)`.

## 스택 정규화

- `normalizeSideLeftStack(ads)` / `normalizeSideRightStack(ads)`  
  - API 배열을 4칸·3칸으로 맞춤.  
  - `sideLeft` / `sideRight` 단일 객체에만 `src`가 있고 스택 0번이 비어 있으면 **0번에 병합**.

## 슬롯별 DOM (`setSideStackSlot`)

- 요소: `#sideAdL_img{i}`, `#sideAdR_img{i}`, 카드 내 `.side-ad-ph`.

| 조건 | 동작 |
|------|------|
| `item.src` **공백 제거 후 비어 있음** | `img.removeAttribute('src')`, `img.hidden = true`, `.has-ad` 제거, 플레이스홀더 `display` 복구 |
| `item.src` **있음** | `img.src = resolveAdImageSrc(src)` 후 `onload`에서 `hidden = false`, 플레이스홀더 숨김; `onerror` 시 다시 숨김 |

## `resolveAdImageSrc`

- `http(s)://`, `data:` → 그대로.
- **`/uploads/`로 시작하는 절대 경로**만 `NW_PUBLIC_UPLOAD_ORIGIN || API_ORIGIN` 접두.
- 그 외 상대·`/ads/...` 등은 **문자열 그대로** 브라우저가 현재 문서 오리진 기준으로 요청.

## 데이터가 있어도 hidden 되는 경우

- **이미지 로드 실패(`onerror`)** → `hidden = true`, 플레이스홀더로 폴백.
- **그 외** 프론트가 정상 `src`인데도 무조건 숨기는 분기는 없음.

## 감사 결론

- 운영 페이로드에서 **`src`가 빈 문자열**이면 위 표의 **빈 슬롯 분기**가 실행되어 플레이스홀더만 보이는 것이 **설계상 정상 동작**이다.
