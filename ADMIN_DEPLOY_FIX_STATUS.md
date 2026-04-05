# ADMIN 배포 수정 반영 상태 (검증 전용, 추측 없음)

## 로컬 Git (측정: 작업 시점, 저장소: newswindow)

| 항목 | 결과 |
|------|------|
| `master` HEAD | `813e60ac410d34254c896c49449247aa236e92b1` |
| `origin/master` | 동일 `813e60a…` (로컬 fetch 기준) |
| `scripts/vercel-build.mjs` 추적 여부 | **`git ls-files` 결과 없음** → 저장소에 **미등록(미커밋)** |
| `813e60a` 트리에 `admin/dist → public/admin` 복사 스크립트 | **포함되지 않음** (해당 경로 파일이 Git에 없음) |

## 결론 (위事实만)

- **`vercel-build.mjs` “항상 public/admin 복사” 수정은 현재 `master`/`origin/master` 커밋 어디에도 포함되어 있지 않다.**
- Production에 그 로직이 반영되려면 **파일 추가·커밋·원격 푸시·Vercel 재배포**가 선행되어야 한다. (이 문서는 배포 실행을 대신하지 않음.)

## Vercel latest production = 위 커밋인지

- 이 환경에서 **Vercel 대시보드 / 인증된 CLI 없이** production 배포가 연결된 Git SHA를 확정할 수 없음.
- **간접 증거**: 아래 `ADMIN_ROUTE_VERIFICATION.md` 시점에 `/admin`·`/admin/index.html`·`/admin/assets/*` 가 여전히 **NOT_FOUND** → 최소한 “신규 admin 정적 산출물이 붙은 상태”는 아님.
