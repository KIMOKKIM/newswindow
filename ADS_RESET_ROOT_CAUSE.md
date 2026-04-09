> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 광고 “초기화” 직접 원인 확정

## 사용자 증상

- 좌·우 사이드·하단 롤링이 안 보임.  
- 광고 관리 대시보드가 비어 있는 것처럼 보임.

## 코드·HTTP 기준 분류

### 1) 조회 경로 불일치 (확정 — 이번 장애의 직접 원인)

- **메인**: `ADS_API === ''`일 때 `https://www.newswindow.kr/api/ads` 호출 → **404**.  
- **대시보드**: `VITE_API_ORIGIN` 없이 빌드돼 `apiUrl`이 상대 `/api/ads`만 쓰면 동일하게 **404**.  
- `script.js`의 `catch`는 **빈 스택 + 로컬 `footerAds`** 로 폴백하므로, 화면에는 “광고가 사라진 것”과 유사하게 보임.  
- **결론**: 저장소의 데이터가 반드시 삭제된 것은 아니며, **잘못된 호스트로 조회해 실패**한 경우가 본 레포·운영 구조와 부합한다.

### 2) 재배포 시 실제 초기화 (가능 — 인프라 확인 필요)

- `NW_ADS_JSON_PATH` 미설정 시 기본 `backend/data/ads.json`은 **컨테이너 로컬 디스크**에 있으면 배포마다 리셋될 수 있음 (`ads.js` 주석과 동일).  
- 이 경우 **코드 수정만으로 “재배포 후 유지”를 보장할 수 없음** → Render 등에서 **영구 디스크 + `NW_ADS_JSON_PATH`** 필요.

### 3) 저장 실패 / localStorage 키 변경 / seed 재주입

- 광고 본문은 **localStorage가 아닌 서버 JSON**이므로 “키 변경으로 메인만 초기화” 패턴은 해당 없음.  
- seed가 매 배포 실행되는 CI 설정은 별도 확인; 본 레포 `ads.js`는 파일 없을 때 `getDefaultAds()`로 **메모리 기본값**만 쓰며, **조회 404와는 별개**.

## 한 줄 결론

- **화면상 초기화의 직접 원인**: **조회 경로 불일치(www 정적 사이트의 `/api/ads`)로 인한 실패 + 메인 쪽 catch 폴백.**  
- **데이터 영구 보존**: **`NW_ADS_JSON_PATH`를 영구 볼륨에 두는 운영 설정**이 별도로 필요할 수 있음.
