# Render 영속 디스크 — `NW_ADS_JSON_PATH` / `NW_ARTICLES_JSON_PATH`

## 왜 필요한가

- 기본값: `backend/data/ads.json`, `backend/data/articles.json`(백엔드 패키지 내 상대 경로).
- Render **무볼륨** 웹 서비스는 재배포 시 파일 시스템이 초기화될 수 있어 **JSON·업로드 유실 위험**이 있다.
- **Persistent Disk**를 마운트하고, 아래 환경 변수를 **디스크 안의 절대 경로**로 두면 재배포 후에도 동일 파일을 이어 쓸 수 있다.

## 마운트 경로 확인 방법 (Render 대시보드)

1. [Render Dashboard](https://dashboard.render.com) → 해당 **Web Service** 선택.
2. **Disks** (또는 Persistent Disk) 섹션에서 **Mount Path** 확인.  
   - 예: 서비스 생성 시 디스크를 `/data`로 마운트했다면, 앱에서 접근 가능한 경로는 **`/data`** (문서·UI에 표시된 값이 정답).

※ 프로젝트마다 다르므로 **반드시 대시보드에 표시된 Mount Path**를 사용한다. 여기서는 예시로 `/data`를 쓴다.

## 환경 변수 (정확히 2개)

| 변수 | 역할 |
|------|------|
| `NW_ADS_JSON_PATH` | 광고 JSON 단일 파일 절대 경로 |
| `NW_ARTICLES_JSON_PATH` | 기사 JSON 단일 파일 절대 경로 |

## 최종 입력 예시 (Mount Path가 `/data`일 때)

```env
NW_ADS_JSON_PATH=/data/ads.json
NW_ARTICLES_JSON_PATH=/data/articles.json
```

다른 마운트 예: `/mnt/render-disk` 이면:

```env
NW_ADS_JSON_PATH=/mnt/render-disk/ads.json
NW_ARTICLES_JSON_PATH=/mnt/render-disk/articles.json
```

## 재배포 후 유지 검증

1. 대시보드에서 광고·기사를 저장해 두고 Render에서 **Manual Deploy** 또는 푸시로 재배포.
2. 재배포 후 아래 확인:
   - `GET https://<백엔드>/api/ads` — 이전과 동일한 `footer`·스택(또는 저장한 값).
   - 기사 공개 목록/관리 API — 이전 기사 건수·본문이 유지되는지.
3. 서버 로그에 파일 경로 오류가 없는지 확인.

## 로컬·저장소 참고

- `backend/.env.example`에 동일 변수 예시 반영.
- 광고 라우트: `backend/routes/ads.js` (`NW_ADS_JSON_PATH`).
- 기사 DB 파일: `backend/db/articles.js` (`NW_ARTICLES_JSON_PATH`).
