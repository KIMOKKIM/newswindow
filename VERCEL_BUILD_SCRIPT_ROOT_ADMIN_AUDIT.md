> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# `vercel-build.mjs` — 루트 메인과 `/admin` 공존 점검

## 수정 전 동작 (요약)

1. (Vercel에서만) `admin/` 에서 `npm ci`
2. `admin/` 에서 `npm run build` → `admin/dist/`
3. `public/admin/` 제거 후 `admin/dist/` 내용 전부 복사
4. 종료

## 확인 사항

| 질문 | 수정 전 답 |
|------|------------|
| `admin/dist` → `public/admin` 이 **기존 `public` 루트** 파일을 지우는가? | **아니요.** `public/admin`만 삭제. |
| 메인 사이트 루트 산출물 복사/유지 로직이 있는가? | **없음.** |
| 빌드 순서가 “메인 준비 → admin 복사”인가? | **아니요.** admin만 `public`에 반영. |
| `public/index.html` 존재 보장 | **없음** — 루트 `index.html`은 Git에 있어도 `public/`로 복사되지 않음. |

## 프로덕션에서 기대되는 결과

- 정적 호스팅 루트(관측상 `public/` 내용)에 다음이 **동시에** 있어야 함:
  - `/` → `index.html` (메인)
  - `/admin/` → `admin/index.html` 및 `admin/assets/*`

## 수정 방향 (한 파일)

- `scripts/vercel-build.mjs`에 **저장소 루트의 메인 정적 파일**을 `public/`으로 복사하는 단계를 추가 (admin 복사 후 실행해 `/admin`과 충돌 없음).
