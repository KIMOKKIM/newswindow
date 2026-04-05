# Admin 리다이렉트 · 광고 유지 검증

## 범위

- **코드 변경**: `admin/src/router.js`(포털 URL 고정), `backend/routes/ads.js`(`NW_ADS_JSON_PATH` + 디렉터리 생성).
- **운영 확인**: 아래 항목은 **현재 `https://www.newswindow.kr`에 수정본이 배포되고**, 백엔드에 **`NW_ADS_JSON_PATH`가 영구 볼륨 경로로 설정된 뒤** 완료로 본다. (이 저장소만 반영된 상태에서는 Vercel/Render 설정·재배포가 선행.)

---

## 경로 재검증 (기대)

| 단계 | 기대 |
|------|------|
| 비로그인 | `https://www.newswindow.kr/admin` 포털 HTML 로드 (fetch로 본문 확인 가능). |
| 관리자 로그인 후 푸터「스태프 로그인」으로 `/admin` 진입 | 주소창이 **`https://www.newswindow.kr/admin`** 으로 유지 (더 이상 즉시 `/admin/admin/dashboard`로 `replace` 되지 않음). |
| 대시보드 직접 이용 | 포털에서 「내 대시보드」 등은 여전히 `dashboardPathForRole`에 따라 **`/admin/admin/dashboard`** 로 갈 수 있음(역할 세그먼트; 본 이슈의 “이중 basename” 버그와 별개). |

### 로컬(개발자)

- `admin` 디렉터리에서 `npm run build` — 성공 확인됨.

### 운영(배포 후 담당)

- 브라우저에서 위 시나리오 실행 후 주소창 스크린샷: `docs/screenshots/admin-redirect-fixed.png` 권장.

---

## 광고 재검증 (기대)

전제: Render(또는 백엔드 호스트)에 **`NW_ADS_JSON_PATH=/실제/마운트/ads.json`** (또는 동일 디렉터리 내 파일명) 설정.

| 단계 | 기대 |
|------|------|
| 광고 1 + 푸터 롤링 2 등 저장 | `PUT /api/ads` 200, 디스크 파일 갱신. |
| 저장 후 `GET /api/ads` | 동일 본문. |
| 브라우저 새로고침 / 재로그인 | 동일 데이터. |
| 백엔드 재배포 | **영구 경로를 쓰는 한** 파일 유지 → 데이터 유지. |
| 미설정 시 | 기본 `backend/data/ads.json`은 컨테이너 로컬 → **재배포 시 유실 가능성 동일**. |

### 업로드 이미지

- `uploads/ads/`는 별도 볼륨/S3 없으면 재배포 시 이미지 파일도 유실될 수 있음(이번 `ads.js` 한 파일 수정 범위 밖).

### 스크린샷(권장)

- `docs/screenshots/ads-after-save.png`, `docs/screenshots/ads-after-refresh.png` — 배포 후 수동 캡처.

---

## 아직 이 문서만으로 “완료”라고 하지 않는 조건

1. 수정된 **`admin` 정적 빌드**가 Vercel(또는 `/admin` 호스트)에 반영되지 않은 경우.  
2. **`NW_ADS_JSON_PATH` 미설정**으로 운영 백엔드가 여전히 에페멀 경로만 쓰는 경우.
