> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# Render Persistent Disk — 최종 설정 (`NW_ADS_JSON_PATH`, `NW_ARTICLES_JSON_PATH`)

## Disk Mount Path 확인

1. [Render Dashboard](https://dashboard.render.com) → 해당 **Web Service** (Express 백엔드).
2. **Disks** / Persistent Disk 섹션에서 **Mount Path** 확인.  
   - 이 경로가 컨테이너 안에서의 **루트 기준 절대 경로**이다 (예: `/data`, `/mnt/render-disk`).

## 환경 변수 최종 값 (예시)

Mount Path를 **`/data`** 로 가정할 때:

| 변수 | 값 |
|------|-----|
| `NW_ADS_JSON_PATH` | `/data/ads.json` |
| `NW_ARTICLES_JSON_PATH` | `/data/articles.json` |

Mount Path가 다른 경우 **접두어만 교체**:

- Mount `/mnt/render-disk` →  
  `NW_ADS_JSON_PATH=/mnt/render-disk/ads.json`  
  `NW_ARTICLES_JSON_PATH=/mnt/render-disk/articles.json`

## 코드 연결

- 광고 JSON 읽기/쓰기: `backend/routes/ads.js` → `NW_ADS_JSON_PATH`.
- 기사 JSON: `backend/db/articles.js` → `NW_ARTICLES_JSON_PATH`.

## 재배포 후 유지 검증 절차

1. 대시보드에서 광고·기사를 저장해 고유 식별 가능한 문자열을 하나 남김.
2. Render에서 **Redeploy** (또는 git push 자동 배포).
3. 배포 완료 후:
   - `GET https://<백엔드>/api/ads` — 이전과 동일 본문.
   - 공개 기사 목록/관리 API — 기사 건수·내용 유지.
4. 디스크 미설정 시 이 단계에서 데이터가 초기화되면 **환경 변수·디스크 마운트**를 다시 확인.

## 참고

- 업로드 이미지(`/uploads/...`)까지 재배포 후 유지하려면 업로드 디렉터리도 같은 디스크나 객체 스토리지로 두는 별도 전략이 필요할 수 있다.
