# Vercel `public` / Root / Output 확인 가능 범위

## 대시보드 값 (Root Directory, Output Directory)

- **이 Cursor/CLI 비로그인 환경에서는 Vercel Project Settings를 읽을 수 없음** → repo root 여부, Output Directory 가 `.` 인지 **확정 불가**.
- 사용자 확인 절차(참고만): Project → Settings → General → **Root Directory**; Build & Development → **Output Directory** (비어 있거나 `.` 이 아니면 `public/` 이 배포에서 빠질 수 있음).

## “public 포함 배포” 여부 (증거만)

| 검증 | 결과 |
|------|------|
| 프로덕션 `GET https://www.newswindow.kr/admin/index.html` | **404 NOT_FOUND** |
| 프로덕션 `GET https://www.newswindow.kr/admin/assets/index-58B7bRqQ.js` (로컬 `admin/dist/index.html` 이 참조하는 동일 파일명) | **404 NOT_FOUND** |

**해석 (단정 아님, 관측만):** 위 URL들이 200이 아니므로, **현재 시점 production 출력물에는 해당 경로의 정적 파일이 없다.**  
`public/admin` 이 빌드 후 채워져 루트에 붙었다면 일반적으로 위 요청 중 최소 하나는 200에 가깝게 나와야 하므로, **실측과 “public/admin 포함된 배포” 가설은 모순된다.**

## 리포지토리 의도 (코드만)

- `scripts/vercel-build.mjs` 는 빌드 후 **`public/admin/`** 에 Vite 산출물을 복사하도록 작성됨.
- 위 스크립트가 **Git에 없으면** Vercel 빌드에서 실행·효과가 없을 수 있음 (`vercel.json` 의 `buildCommand` 와의 결합 전제).
