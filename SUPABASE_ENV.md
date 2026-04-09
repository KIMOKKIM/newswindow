# Supabase · 환경 변수 (Vercel / Render / 로컬)

이 프로젝트에서 **운영 기사·광고 설정**은 Node 백엔드가 **Supabase(Service Role)** 로만 읽고 씁니다.  
관리자 SPA(`/admin`)는 **`VITE_API_ORIGIN` → 백엔드 REST** 를 통해 동일 소스를 사용합니다.  
배포 점검은 [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 함께 사용합니다.

## 백엔드 (`backend/` · Render 등 API 호스트)

| 변수 | 필수(운영) | 설명 |
|------|------------|------|
| `SUPABASE_URL` | 예 | 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | 예 | **서버에만** 설정 (anon 키 아님). 과거 이름(`SUPABASE_SERVICE_ROLE` 등)은 코드가 보조로 읽을 수 있으나 통일 권장 |
| `SUPABASE_BANNERS_BUCKET` | 아니오 | Storage 버킷. 기본 `banners` |
| `NODE_ENV` | 권장 `production` | 운영에서 레거시 파일 DB 강제 비활성화에 사용 |
| `RENDER` | Render가 주입 | `true` 이면 운영과 동일 취급(레거시 파일 DB 불가) |
| `JWT_SECRET` | 예 | 인증 서명 |
| `CORS_ORIGIN` | 권장 | 허용 오리진(쉼표 구분). 운영 도메인 포함 |
| `NW_DEV_LEGACY_FILE_DB` | 아니오 | **로컬 개발 전용.** `1` 이면 기사·사용자만 JSON 파일 경로 사용. **운영에서는 무시됨** |
| `NW_LEGACY_FILE_DB` | **사용 안 함** | 구 코드용 이름. **현재 백엔드는 읽지 않음.** 대시보드에 남아 있으면 제거해 혼선을 없앨 것 |

운영에서 Supabase를 쓰려면 **`SUPABASE_URL` + 서비스 롤 키**를 반드시 넣고, **`NW_DEV_LEGACY_FILE_DB` / `NW_LEGACY_FILE_DB`는 비우거나 삭제**합니다.

### 구 변수 `NW_LEGACY_FILE_DB` 정리

- **코드**: 더 이상 참조하지 않습니다. 설정돼 있어도 동작에는 영향 없고, 문서·인지 혼선만 남습니다.
- **배포**: Render/Vercel 환경 변수 목록에서 해당 키를 **삭제** 권장.

## 관리자 SPA (Vite · `admin/` · Vercel 정적 배포)

| 변수 | 용도 |
|------|------|
| `VITE_API_ORIGIN` | 백엔드 베이스 URL (기사·광고·인증 API) |
| `VITE_SUPABASE_URL` | (선택) 브라우저용 Supabase |
| `VITE_SUPABASE_ANON_KEY` | (선택) anon + RLS |

권장: **기사/광고 CRUD는 백엔드 API만** 사용.

## 배포 설정 파일과 env

| 위치 | 비고 |
|------|------|
| [render.yaml](render.yaml) | Web Service `rootDir: backend` — **실제 시크릿은 Render 대시보드**에서 `SUPABASE_*` 등 설정 |
| [vercel.json](vercel.json) | 정적/`/admin` 라우팅·헤더만. **API 시크릿은 Vercel에 둘 필요 없음** (백엔드가 Render 등인 경우) |

구버전 Blueprint 예시에 있던 `NW_ARTICLES_JSON_PATH` / `NW_ADS_JSON_PATH` 는 **API 영속성에는 더 이상 사용하지 않습니다**(기사·광고는 Supabase). 업로드를 디스크에만 둘 계획이 있을 때만 `NW_UPLOADS_ROOT` 등을 별도 검토합니다.

## `/api/health` — 운영 점검용

백엔드 루트 기준 `GET /api/health` (캐시 없음).

### 응답 예시 (운영·정상)

```json
{
  "ok": true,
  "timestamp": "2026-04-01T12:00:00.000Z",
  "storage": "supabase",
  "articlesReadSource": "supabase",
  "adsReadSource": "supabase",
  "supabaseConfigured": true,
  "supabaseConnected": true,
  "adsConfigConnected": true,
  "allStorageOk": true,
  "legacyFileDbFlag": false
}
```

### 필드 기대값 (운영)

| 필드 | 기대값 | 의미 |
|------|--------|------|
| `ok` | `true` | 라우트 정상 |
| `storage` | `"supabase"` | 영속 레이어가 Supabase 모드 |
| `articlesReadSource` | `"supabase"` | 기사 읽기가 DB 테이블 기준 |
| `adsReadSource` | `"supabase"` | 광고 설정이 `ad_site_config` 기준 |
| `supabaseConfigured` | `true` | URL·서비스 롤 키가 env에 존재 |
| `supabaseConnected` | `true` | `articles` 테이블에 대한 `select` 1건이 오류 없이 완료 |
| `adsConfigConnected` | `true` | `ad_site_config` 에서 `id = 1` 행 조회 시 오류 없음(행 없음도 `maybeSingle`로 정상) |
| `allStorageOk` | `true` | `supabaseConnected` · `adsConfigConnected` 모두 성공 |
| `legacyFileDbFlag` | `false` | 운영에선 레거시 파일 DB 플래그 비활성 |

`supabaseConnected` 또는 `adsConfigConnected` 가 `false` 인데 `supabaseConfigured` 가 `true` 이면, URL/키 오류·네트워크·테이블·RLS 등을 Supabase 로그와 대조합니다.

---

## 검증 절차 (기사 1건 작성)

1. 관리자에서 **기자 계정**으로 로그인하거나, API로 `POST /api/auth/login` 후 `Authorization: Bearer <token>` 확보.
2. `POST /api/articles`  
   본문 예: `{ "title": "헬스체크 기사", "content": "내용", "status": "draft" }`  
3. 응답 **201** 및 JSON에 `id` 확인.
4. 서버 로그에 `[nw/articles]` … `articlesReadSource` / `articlesWriteSource` 가 `supabase` 인지 확인(운영).
5. (아래) Supabase에서 동일 `id` 행 확인.

## 검증 절차 (광고 배너 1건 수정)

1. **관리자** 계정으로 로그인.
2. `PUT /api/ads`  
   예: `{ "headerLeft": { "src": "https://…", "href": "https://…" } }` (실제 공개 URL 사용)  
3. 응답 **200** 및 병합된 광고 JSON 확인.
4. 서버 로그에 `[nw/ads]` … `adsReadSource` / `adsWriteSource` 가 `supabase` 인지 확인.
5. (아래) `ad_site_config` 행 확인.

## 저장 직후 Supabase에서 row 확인

Supabase 대시보드 → **SQL Editor**:

```sql
-- 기사: 방금 생성·수정한 id로 조회
select id, title, status, updated_at
from public.articles
order by updated_at desc
limit 5;

-- 광고: 단일 행 JSONB
select id, updated_at, config
from public.ad_site_config
where id = 1;
```

또는 Table Editor에서 `articles` / `ad_site_config` 를 직접 열어 갱신 시각·내용이 맞는지 봅니다.

## 재배포 후 데이터 유지 검증

1. 배포 **전** Supabase에서 테스트용 기사 `id`·광고 `config` 일부(예: 특정 문자열)를 메모.
2. Render(또는 호스팅)에서 **재배포** 또는 **수동 재시작** 실행.
3. 배포 후 `GET /api/health` 로 `allStorageOk`·소스 필드 등 기대값 유지 확인.
4. `GET /api/articles/public/list` 또는 해당 기사 `GET /api/articles/public/:id` 로 **동일 id·내용** 확인.
5. `GET /api/ads` 로 광고 필드가 **재배포 전과 동일**한지 확인.
6. (이중 확인) Supabase SQL로 동일 `id` / `ad_site_config` row가 그대로인지 확인.

**포인트**: 기사·광고 본문은 **Supabase Postgres**에 있으므로, 앱 컨테이너를 갈아끼워도 데이터는 유지됩니다. 유실이 의심되면 인스턴스 로컬 `articles.json`/`ads.json`이 아니라 **항상 DB**를 봅니다.

---

## 운영 점검 체크리스트

- [ ] Render(백엔드)에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 설정, 키가 anon이 아님
- [ ] `NW_LEGACY_FILE_DB` 키 **없음** (있으면 삭제)
- [ ] `NW_DEV_LEGACY_FILE_DB` 운영에서 **비어 있음** 또는 미설정
- [ ] `NODE_ENV=production` (권장)
- [ ] `GET https://<백엔드>/api/health` → `articlesReadSource`·`adsReadSource`·`supabaseConnected`·`adsConfigConnected`·`allStorageOk` 기대값
- [ ] 관리자 `VITE_API_ORIGIN` 이 위 백엔드와 일치
- [ ] Storage 버킷(`banners` 등) 존재·권한 확인(광고 이미지 업로드 시)
- [ ] 재배포 후 기사·광고 샘플 id로 목록/상세 재확인

## npm / Vite 주의 (로컬 `admin` 빌드)

Windows 등에서 `NODE_ENV=production` 이 잡혀 있으면 `npm ci` 가 devDependencies(`vite`)를 생략할 수 있습니다.  
관리자 빌드 전에는 `NODE_ENV=development` 로 두거나 `npm ci --include=dev` 를 사용하세요.

## Storage

1. Supabase → Storage → 버킷 `banners` (또는 `SUPABASE_BANNERS_BUCKET` 과 동일).  
2. 공개 배너면 **Public bucket** 권장.  
3. 업로드는 **`POST /api/ads/upload`** (서버 + Service Role) 사용.

## 데이터 이전

과거 `articles.json` / `users.json` / `ads.json` 은 별도 스크립트·CSV로 마이그레이션해야 합니다.
