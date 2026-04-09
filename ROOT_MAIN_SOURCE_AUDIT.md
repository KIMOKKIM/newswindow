> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 루트 메인페이지 소스 위치 감사

## 확인 일시

- 로컬 저장소 HEAD 기준 파일 시스템 및 `git ls-files`로 확정.
- 프로덕션 URL 응답은 `ROOT_OUTPUT_CONFLICT_AUDIT.md`와 동일 시점 측정값을 참고.

## 기존 메인페이지 실제 소스 위치

| 항목 | 위치 |
|------|------|
| 진입 HTML | 저장소 **루트** `index.html` (`./index.html`). `public/index.html`은 빌드 전에는 없음(로컬 빌드 후 `vercel-build`가 생성). |
| 스타일 | 루트 `styles.css` |
| 스크립트 | 루트 `script.js` |
| 연결 HTML | 루트 `article.html`, `info.html`, `signup.html` 등 |
| 이미지 | 루트 `images/` (일부 PNG는 Git 추적됨) |

## 정적 vs 빌드 산출물

- 루트 메인은 **Vite 등 단일 빌드 파이프라인 산출물이 아님**. **정적 HTML + CSS + JS + 이미지**가 저장소 루트에 존재.
- `/admin`은 **별도 앱**: `admin/` 아래 Vite 프로젝트, 빌드 산출은 `admin/dist/` → `vercel-build`가 `public/admin/`으로 복사.

## `/` 와 `/admin` 산출물 관계

- **서로 다른 소스 트리**: 루트 정적 파일(메인) vs `admin/` SPA(신규 admin).
- 배포 시 둘 다 사이트 루트에서 서비스하려면 **동일한 정적 루트(관측상 `public/`)** 아래에 `index.html`(메인)과 `admin/`(admin)가 함께 있어야 함.

## 현재 빌드에서 루트 메인 산출물이 생기는 경로 (수정 전)

- `scripts/vercel-build.mjs`는 수정 전 **`admin/dist` → `public/admin/`** 만 수행.
- 루트 `index.html` 등은 **자동으로 `public/`에 복사되지 않음**.
