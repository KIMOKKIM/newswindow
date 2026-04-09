> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 프로덕션 출력물 대조 — 루트 vs `/admin`

## 측정 시점

- 배포 수정 **이전** 기준으로 `curl.exe -sI` 로 응답 헤더만 수집 (본문 추측 없음).

## 관측 결과 요약

| URL | HTTP | 비고 |
|-----|------|------|
| `https://newswindow.kr/` | 307 | `Location: https://www.newswindow.kr/` |
| `https://www.newswindow.kr/` | **404** | `X-Vercel-Error: NOT_FOUND` |
| `https://www.newswindow.kr/index.html` | **404** | `X-Vercel-Error: NOT_FOUND` |
| `https://www.newswindow.kr/admin` | **200** | admin 정적 파일 존재 |
| `https://www.newswindow.kr/admin/index.html` | **200** | admin 정적 파일 존재 |

## 해석 (관측에 직접 대응하는 것만)

1. **프로덕션에서 `/`가 404인 이유**: `www` 호스트로 최종 요청 시 `NOT_FOUND` — 해당 경로에 매칭되는 정적 리소스가 배포 출력에 없음.
2. **`/index.html`**: 동일하게 404 — 루트 `index.html` 파일이 배포 정적 루트에 없음.
3. **`/admin` vs `/`**: `/admin`은 200, `/` 및 `/index.html`은 404 — **`/admin` 산출물만 정적 루트에 존재**하고, **메인 루트 파일은 없음**.
4. **동시 존재 구조**: 정상 상태에서는 **정적 루트에 `index.html`(메인)과 `admin/index.html`이 함께** 있어야 함. 관측상 수정 전에는 메인 쪽이 빠져 있음.

## `scripts/vercel-build.mjs` 가 루트 파일을 지우는가

- 스크립트는 **`public/admin`만** `rmSync(..., { recursive: true, force: true })` 후 재생성.
- **`public/` 전체를 비우지는 않음** — 따라서 “메인 파일을 스크립트가 직접 삭제했다”기보다, **애초로 메인을 `public/`에 넣는 단계가 없어** 배포 출력에 포함되지 않은 상태로 해석하는 것이 코드와 부합함.
