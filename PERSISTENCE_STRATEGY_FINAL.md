> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 지속성 전략 (최종)

## 코드로 해결되는 것

- `NW_ADS_JSON_PATH`, `NW_ARTICLES_JSON_PATH` **지원**(이미 `ads.js`, `articles.js`에 구현).
- 저장/조회 경로 **통일**: 두 API 모두 동일 JSON 파일(또는 디스크상 동일 마운트 아래 파일)을 본다.

## 인프라가 필요한 것

- **재배포·재시작 후 유지**: 앱이 쓰는 JSON이 **영구 볼륨** 위에 있어야 함.
- 저장소 루트에 **`render.yaml`** 예시 추가: 마운트 `/data`,  
  `NW_ADS_JSON_PATH=/data/ads.json`, `NW_ARTICLES_JSON_PATH=/data/articles.json`.
- 실제 서비스는 대시보드에서 **Disk 생성·마운트·환경 변수**를 동일하게 맞춘다.

## Free만 쓰는 경우

- 디스크를 붙이지 않으면 **파일 기반 JSON만으로는 재배포 후 유지를 보장할 수 없다**고 보는 것이 맞다.
- 장기적으로는 **관리형 DB**(Supabase, PlanetScale 등) 또는 **S3 등 객체 스토리지**로 이관이 안전하다.

## 업로드 이미지

- `/uploads` 아래 파일도 에페메럴이면 이미지 URL은 남아도 파일은 사라질 수 있음 — 별도 스토리지 정책 권장.
