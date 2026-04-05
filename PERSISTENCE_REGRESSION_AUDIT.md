# 기사·광고 저장 영속성 점검

## 코드상 실제 경로 (`backend/config/dataPaths.js`)

| 변수 | 미설정 시 기본값 |
|------|------------------|
| `NW_ARTICLES_JSON_PATH` | `backend/data/articles.json` (저장소 기준 절대 경로로 해석) |
| `NW_ADS_JSON_PATH` | `backend/data/ads.json` |
| `NW_USERS_JSON_PATH` | `backend/data/users.json` |
| `NW_UPLOADS_ROOT` | `backend/uploads` |

기본 경로는 **저장소에 포함된 파일** 또는 빌드 시 생성된 경로로, **Render 등 에페메럴 파일시스템에서는 재배포·재시작 시 초기화될 수 있음** (`backend/lib/persistenceDiagnostics.js` 가 동일 설명).

## `render.yaml` (저장소 기준 의도)

- `NW_ARTICLES_JSON_PATH=/data/articles.json`
- `NW_ADS_JSON_PATH=/data/ads.json`
- Persistent Disk `mountPath: /data`

**실제 Render 대시보드**에서 Blueprint 미적용·env 누락·디스크 미부착이면 런타임은 위 env 없이 뜨고 **기본 `backend/data/*.json` 으로 동작**한다.

## 데이터가 “다시 사라지는” 직접 원인(구조적으로 확정 가능한 1가지)

- **영구 볼륨에 쓰지 않고 에페메럴 경로에 쓰는 경우** → 재배포마다 이미지 및 JSON이 **깃/이미지에 있던 초기 상태**로 돌아가거나 빈 배열로 다시 시작.

## 코드베이스에서 이미 있던 완화

- 기동 시 `logPersistenceOnStartup()`: `NODE_ENV=production` 또는 `RENDER=true` 또는 `NW_PERSISTENCE_WARN=1` 일 때 **경고 로그**.

## 이번 추가 조치

- `RENDER === 'true'` 인데 `NW_ARTICLES_JSON_PATH` 또는 `NW_ADS_JSON_PATH` 가 비어 있으면 **`process.exit(1)`** (`exitIfRenderMissingJsonPaths()`).
  - Render에 **반드시** 위 env + 디스크를 맞추도록 강제한다.
  - **로컬**에서는 보통 `RENDER` 미설정이라 동작 변경 없음.

## 운영에서 직접 확인할 것 (대시보드)

1. Web Service 환경 변수에 `NW_ARTICLES_JSON_PATH`, `NW_ADS_JSON_PATH` 존재 여부 및 값이 디스크 마운트와 일치하는지.
2. Persistent Disk가 해당 서비스에 연결되어 있는지.
3. 배포 로그에 `[persistence]` / `[NW FATAL]` 유무.
