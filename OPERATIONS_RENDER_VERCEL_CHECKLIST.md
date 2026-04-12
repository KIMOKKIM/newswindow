# Render / Vercel 운영 점검 체크리스트

**현재 기준**: 기사·광고 설정은 **Supabase만** 읽고 씁니다. 과거 JSON·`NW_ARTICLES_JSON_PATH` / `NW_ADS_JSON_PATH` 전제 문서는 참고용이며, env는 이 파일과 [SUPABASE_ENV.md](./SUPABASE_ENV.md)를 따릅니다.

---

## 제거·비우기 권장 구 환경변수

배포 대시보드(Render / 기타 호스트)에 아래가 **남아 있으면 삭제 또는 비움** 처리해 혼선을 줄이세요. (코드가 일부는 무시하지만, 문서·온콜이 과거 구조로 잘못 연결되는 리스크가 있습니다.)

| 변수 | 비고 |
|------|------|
| `NW_LEGACY_FILE_DB` | **미사용**. 예전 “파일 DB” 플래그. 제거. |
| `NW_ARTICLES_JSON_PATH` | API 기사 영속에 **미사용**(레거시 진단·스크립트용 경로일 뿐). Supabase만 쓸 거면 제거 권장. |
| `NW_ADS_JSON_PATH` | 광고 API는 **`ad_site_config`만** 사용. 제거 권장. |

**운영에 두면 안 되는 조합**

- `NW_DEV_LEGACY_FILE_DB=1` 은 **로컬 개발 전용**입니다. Render 등 운영 인스턴스에는 설정하지 마세요.

**반드시 유지할 변수 (백엔드)**

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (또는 코드가 읽는 동등 키—[SUPABASE_ENV.md](./SUPABASE_ENV.md) 참고)
- `JWT_SECRET`, `CORS_ORIGIN` (운영 도메인 반영)

**Vercel (관리자 정적 빌드)**

- `VITE_API_ORIGIN` → 실제 백엔드 베이스 URL
- Service Role 키는 **프론트 빌드에 넣지 않음**

---

## 배포 전 체크 (Render 백엔드)

- [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 설정·프리뷰 값 길이만 확인(값 복사 금지 로그)
- [ ] 구 env 표에 있는 항목 제거
- [ ] `NODE_ENV=production` (또는 플랫폼 기본이 production인지 확인)
- [ ] Supabase에 `public.articles`, `public.ad_site_config` 테이블 존재

## 배포 전 체크 (Vercel · admin)

- [ ] `VITE_API_ORIGIN` 이 프로덕션 백엔드 URL과 일치
- [ ] 재빌드 후 `/admin` 이 최신 번들인지 확인

---

## `/api/health` 해석

`GET https://<백엔드>/api/health`

| 필드 | 정상(운영) |
|------|------------|
| `articlesReadSource` | `"supabase"` |
| `adsReadSource` | `"supabase"` |
| `supabaseConfigured` | `true` |
| `supabaseConnected` | `true` (`articles` 접속 가능) |
| `adsConfigConnected` | `true` (`ad_site_config` id=1 조회 가능—에러 없음) |
| `allStorageOk` | `true` (위 두 프로브 모두 성공) |
| `legacyFileDbFlag` | `false` |

`adsConfigConnected` 가 `false` 이면 테이블 미생성·RLS·키 오류·네트워크 등을 Supabase 로그와 대조하세요.

---

## 운영 배포 후 5분 점검표

시간을 넉넉히 잡아 **약 5분 안에** 아래를 순서대로 처리합니다.

1. **Health (30초)**  
   - 브라우저 또는 `curl`로 `GET /api/health`  
   - `allStorageOk` === `true`, `legacyFileDbFlag` === `false` 확인

2. **공개 기사 (1분)**  
   - `GET /api/articles/public/list` 200, JSON 배열 정상

3. **공개 광고 (30초)**  
   - `GET /api/ads` 200, 기대 키(`headerLeft` 등) 존재

4. **관리자 연결 (1분)**  
   - 프로덕션 `/admin` 로드, 로그인 시도(세션·CORS 이슈 없음)

5. **선택 심화 (2분)**  
   - Supabase Table Editor에서 `articles` 최신 row 1건·`ad_site_config` id=1 존재 확인

6. **로그 (30초)**  
   - Render(또는 호스트) 로그에 Supabase 연결 오류·`FATAL` 없음

한 항목이라도 실패하면 롤백 여부를 판단하고, `health`의 `false` 필드(`supabaseConnected`, `adsConfigConnected` 등)를 기준으로 DB 쪽을 우선 조사합니다.

---

## 관련 코드·문서

- [SUPABASE_ENV.md](./SUPABASE_ENV.md) — 변수 설명·SQL 검증 예시·재배포 확인
- [render.yaml](./render.yaml) — Blueprint 참고(시크릿은 대시보드)
- 헬스 구현: `backend/server.js` — `articles` + `ad_site_config` 프로브
