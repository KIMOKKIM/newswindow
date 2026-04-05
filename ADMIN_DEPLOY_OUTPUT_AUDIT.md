# Vercel production 산출물 대조

## 리포지토리 기준 (코드에서 읽히는 값)

- **Root Directory**: 리포 루트에 `vercel.json`, `package.json`, `api/` 존재. (대시보드에서 하위 폴더로 바꿨다면 이 문서와 불일치할 수 있음 — **코드만으로는 대시보드 값 미확정**.)
- **Build Command (`vercel.json`)**: `npm run vercel-build`
- **빌드 스크립트 목표**: `admin/dist` 생성 후 **`public/admin/`** 에 동일 내용 복사 (Vercel이 `public` 을 루트 URL에 붙이는 전제).

## 프로덕션 실측 (측정 시점: 작업 중 `curl.exe -sI`)

| URL | HTTP | 비고 |
|-----|------|------|
| `https://www.newswindow.kr/admin` | **404** | `X-Vercel-Error: NOT_FOUND` |
| `https://www.newswindow.kr/admin/index.html` | **404** | 동일 NOT_FOUND |
| `https://www.newswindow.kr/admin/assets/index-58B7bRqQ.js` | **404** | 로컬 빌드 해시 파일명으로 시험 — 산출 없음 |
| `https://newswindow.kr/admin` | **307** | `Location: https://www.newswindow.kr/admin` → 최종 www 에서 404 |

## 결론 (증거 기반)

- **404 성격**: `X-Vercel-Error: NOT_FOUND` 는 **요청 경로에 매칭되는 배포 산출물이 없음**을 나타내는 Vercel 전형 응답.
- **`/admin/index.html` 도 404** → rewrite 목적지 파일이 배포에 **없음** (rewrite만 빠진 경우가 아니라, **출력물 없음**이 직접 증거).
- **기존 admin vs 신규**: 신규 SPA용 정적 트리(`public/admin` 또는 동등)가 **현재 production 번들에 포함되지 않은 상태**로 관측됨.

## Dashboard 미확정 항목 (사용자가 직접 확인 필요)

- Project Settings → **Root Directory** (`.` 인지)
- **Output Directory** 오버라이드 (`.git` 외 폴더만 배포하면 `public/` 누락 가능)
- **System Environment Variables** 노출 여부 (`VERCEL` 등)
