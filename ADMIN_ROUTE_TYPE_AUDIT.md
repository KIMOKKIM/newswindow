> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# /admin 경로 유형 확정

## 유형

- **정적 파일 + 클라이언트 SPA**: Vite가 만든 `index.html` + 해시 번들 JS/CSS.
- **서버 라우트(Next 등) 아님**: 리포에 Next 앱 없음.
- **엔드포인트**: 브라우저는 먼저 **`/admin/index.html`**(또는 동일 내용 파일)과 **`/admin/assets/*`** 를 받아야 함.

## 배포에서 열리기 위해 필요한 것

1. **정적 파일**: 배포 산출물에 **`/admin/index.html`** 및 **`/admin/assets/…`** 에 대응하는 파일이 실제로 있어야 함.  
   (이 리포에서는 빌드 후 **`public/admin/`** 에 복사하는 전략.)
2. **SPA 폴백**: 직접 URL ` /admin/reporter/dashboard` 등은 파일이 없으므로 **`vercel.json` 의 `rewrites`** 로 `/admin/index.html` 로 돌려야 함. (정적 파일이 있어도 리라이트 없으면 딥링크만 깨짐; 루트 `/admin` 은 `index.html` 또는 리라이트로 처리.)

## 정리 /admin 종류

| 구분 | 설명 |
|------|------|
| 정적 | `index.html` + `assets/*` |
| SPA | 라우팅은 클라이언트(`router.js`); 서버는 HTML 한 벌만 제공하면 됨 |
| 필요 설정 | 산출물 존재 + (선택) rewrite |
