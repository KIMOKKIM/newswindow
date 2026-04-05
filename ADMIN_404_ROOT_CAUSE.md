# /admin 404 직접 원인 1개 (확정)

## 원인 (단일)

**Production 배포 산출물에 신규 admin 정적 파일(`public/admin/**` 에 대응하는 `/admin/index.html` · `/admin/assets/*`)이 포함되지 않는다.**

## 근거

1. `https://www.newswindow.kr/admin/index.html` 이 **404** — 리라이트 없이도 있어야 할 정적 엔트리가 없음.
2. 동일 호스트에서 `/admin/assets/...` 도 **404** — 번들도 배포되지 않음.
3. `scripts/vercel-build.mjs` 는 수정 전 **`VERCEL === '1'`** (또는 소수 env)일 때만 `admin/dist` → `public/admin` 복사 후 종료.  
   Vercel 문서상 **`VERCEL`은 프로젝트에서 시스템 환경 변수 자동 노출이 꺼져 있으면 빌드에 안 넘어올 수 있다.**  
   이 경우 빌드는 `admin/dist`까지만 만들고 **`public/admin` 복사 단계를 건너뛰고 exit 0** → 배포 트리에 `/admin` 파일 없음 → NOT_FOUND.

## 채택하지 않은 다른 가설 (증거 불충분 또는 배제)

- **rewrite 누락만**: `vercel.json` 에 이미 `/admin` → `/admin/index.html` 존재. 목적지 파일 자체가 404이므로 1차 원인 아님.
- **도메인만 오래된 배포**: 가능성은 있으나, 지금 관측은 “파일 없음” 패턴에 부합.
- **nw-office / 로그인**: 사용자 지시에 따라 범위 외.
