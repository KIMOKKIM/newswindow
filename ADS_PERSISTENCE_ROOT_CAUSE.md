# 광고 데이터가 사라진 직접 원인 (확정)

## 저장·조회 흐름 (코드 기준)

1. **저장**  
   - Admin SPA → `PUT /api/ads`(인증) → `backend/routes/ads.js` → **`saveAds()`** → **`fs.writeFileSync(adsPath, ...)`**
2. **조회**  
   - 메인 / API → `GET /api/ads` → `loadAds()` → **`fs.readFileSync(adsPath)`** (없으면 기본값)
3. **저장 위치**  
   - **로컬 파일**: 기본 `backend/data/ads.json` (`path.join(__dirname, '..', 'data', 'ads.json')` 계열).  
   - **DB / localStorage / 정적 public 파일 아님.**

## 직접 원인 1개

**광고 설정은 호스트의 로컬 파일 시스템 한 경로에만 기록된다. 운영 백엔드(예: Render 등)가 재배포될 때 컨테이너 파일시스템이 이미지/리포 상태로 바뀌면, 마지막 배포 이후 디스크에만 쌓였던 `ads.json` 변경분은 반영되지 않거나 기본·리포 버전으로 돌아가 “사라진 것처럼” 보인다.**

- **“저장 실패”만**인 경우: Admin에서 403/네트워크 오류가 나야 하며, 이번 증상(저장 후 시간이 지나 사라짐)과 패턴이 다름.
- **“조회 경로가 달라짐”**: 신규/구 admin이 **동일** `GET/PUT /api/ads`를 쓰면 경로 불일치로 설명하기 어렵다. 저장소는 백엔드 파일 하나.
- 따라서 **비영속(또는 재배포 시 초기화되는) 서버 디스크**가 본 증상과 부합한다.

## 업로드 이미지

- `POST /api/ads/upload`는 **`backend/uploads/ads/`** 에 파일을 쓴다. 동일하게 **디스크가 비영속이면 재배포 후 이미지도 유실**될 수 있다. (이번 코드 변경 1건은 `ads.json` 경로만 영구 볼륨 연결을 허용.)

## 이번 수정

- **`backend/routes/ads.js` 한 파일**: `NW_ADS_JSON_PATH` 환경 변수가 있으면 그 절대 경로에 `ads.json`을 읽고 쓴다.  
  **운영에서는 이 경로를 호스트가 제공하는 영구 디스크(예: Render Disk 마운트 경로)로 설정해야** 재배포 후에도 내용이 유지된다.
