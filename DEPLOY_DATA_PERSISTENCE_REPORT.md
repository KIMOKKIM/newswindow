> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 배포 시 기사·광고 유실 — 점검 보고 및 개선 요약

## 1. 원인 (저장 알고리즘 버그가 아님)

백엔드는 기사·광고·사용자를 **파일(JSON)** 로, 광고 배너 이미지는 **로컬 디렉터리**에 저장한다.

| 데이터 | 기본 저장 위치 | `save()` 동작 |
|--------|----------------|---------------|
| 기사 | `backend/data/articles.json` | 배열 전체를 파일에 덮어씀 |
| 광고 설정 | `backend/data/ads.json` | 동일 |
| 사용자 | `backend/data/users.json` | 동일 |
| 광고 업로드 이미지 | `backend/uploads/ads/*` | 바이너리 직접 쓰기 |

Render·Docker 등 **에페메럴 파일시스템**에서는 **새 이미지로 컨테이너가 교체될 때마다** 위 경로가 리포지토리 초기 상태(또는 빈 디렉터리)로 돌아간다.  
즉 **덮어쓰기 로직 오류**라기보다, **영구 디스크 밖에 저장하고 있어서** 배포마다 “사라지는” 것이다.

`vercel-build` 는 **프론트(`public/`)만** 다루며 Render 백엔드 JSON을 직접 삭제하지는 않는다. 증상의 트리거는 **백엔드 재배포/재시작**이 일반적이다.

## 2. 코드 개선 사항 (이번 반영)

1. **`backend/config/dataPaths.js`**  
   기사·광고·사용자·업로드 루트 경로를 **한곳에서** 계산.

2. **`NW_USERS_JSON_PATH`**, **`NW_UPLOADS_ROOT`**  
   - 사용자 JSON도 기사와 동일하게 디스크로 빼기 가능.  
   - 광고 이미지는 `NW_UPLOADS_ROOT/ads/` 아래에 저장(정적 서빙 `app.use('/uploads', …)` 와 동일 루트).

3. **`backend/lib/atomicJsonWrite.js`**  
   JSON 저장을 **임시 파일 → rename** 으로 바꿔, 저장 중 프로세스 종료 시 **빈 파일/깨진 JSON** 위험을 줄임. (유실 문제의 근본은 아니나 안전성 개선.)

4. **`backend/lib/persistenceDiagnostics.js`**  
   서버 기동 시 실제 사용 경로를 로그 출력.  
   `NODE_ENV=production` 또는 `RENDER=true` 또는 `NW_PERSISTENCE_WARN=1` 이면, 기본 번들 내 경로 사용 시 **유실 경고**를 `console.warn` 한다.

5. **`backend/.env.example`**  
   네 환경 변수 조합을 문서화.

## 3. 운영 필수 체크리스트 (Render 예: 디스크 마운트 `/data`)

다음을 **동일 Persistent Disk** 아래에 두는 것을 권장한다.

```env
NW_ARTICLES_JSON_PATH=/data/articles.json
NW_ADS_JSON_PATH=/data/ads.json
NW_USERS_JSON_PATH=/data/users.json
NW_UPLOADS_ROOT=/data/uploads
```

디스크를 처음 붙인 뒤 **기존 `backend/data/*.json` 내용을 한 번 복사**해 두면 재배포 후에도 이어서 사용할 수 있다.

## 4. 검증 방법

1. 위 환경 변수 설정 후 서버 기동 로그에 `[persistence]` 줄 4줄이 **디스크 경로**를 가리키는지 확인.  
2. 관리자에서 광고 저장·이미지 업로드, 기사 저장 후 **Manual Deploy** 로 재배포.  
3. 재배포 후 `GET /api/ads`, 기사 API, 정적 `/uploads/ads/...` 가 동일한지 확인.

## 5. 장기 권장

JSON 단일 파일은 동시 쓰기·규모 한계가 있다. 트래픽·동시 편집이 커지면 **Postgres/S3** 등 외부 저장소로 이전하는 편이 안전하다.
