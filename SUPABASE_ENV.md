# Supabase · 환경 변수 (Vercel / 로컬)

이 프로젝트의 **기사·사용자·광고 설정**은 Node 백엔드가 **Supabase Service Role**로 읽고/씁니다.  
관리자 SPA(`/admin`)는 기본적으로 **동일 백엔드 REST**(`VITE_API_ORIGIN`)를 호출하며, 백엔드가 Supabase에 연결됩니다.

## 백엔드 (`backend/` · Render 등 API 호스트)

| 변수 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | Supabase 사용 시 | 프로젝트 URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 사용 시 | **서버에만** 설정 (절대 Vercel 프론트에 넣지 말 것) |
| `SUPABASE_BANNERS_BUCKET` | 아니오 | Storage 버킷 이름. 기본 `banners` |
| `NW_LEGACY_FILE_DB` | 아니오 | `1`이면 기존 JSON 파일+로컬 업로드 경로 사용 (비상용) |

Supabase를 쓰려면 **`NW_LEGACY_FILE_DB` 를 비우거나** 설정하지 마세요.

## 관리자 SPA (Vite · `admin/` · Vercel에 `/admin` 정적 배포 시)

Vite는 `NEXT_PUBLIC_*` 대신 **`VITE_*`** 와 `import.meta.env` 를 사용합니다.

| Vite 변수 | Next.js 대응 | 용도 |
|-----------|----------------|------|
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | 브라우저용 Supabase 클라이언트 (선택) |
| `VITE_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 anon 키 (선택·RLS 정책 필요) |

- 현재 권장 흐름: **기사/광고 CRUD는 `VITE_API_ORIGIN` → 백엔드 → Service Role** 로만 수행.
- `admin/src/lib/supabaseClient.js` 는 향후 공개 읽기·실시간 등에 쓸 수 있도록 준비만 되어 있습니다.

## npm / Vite 주의 (로컬 `admin` 빌드)

Windows 등에서 `NODE_ENV=production` 이 잡혀 있으면 `npm ci` 가 devDependencies(`vite`)를 생략할 수 있습니다.  
관리자 빌드 전에는 `NODE_ENV=development` 로 두거나 `npm ci --include=dev` 를 사용하세요.

## Vercel 대시보드에 넣을 값 (요약)

1. **백엔드(API) 서비스 환경 변수**  
   - `SUPABASE_URL`  
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **관리자 프론트 빌드 시** (필요할 때만)  
   - `VITE_API_ORIGIN=https://(백엔드호스트)`  
   - 선택: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Storage

1. Supabase → Storage → **New bucket** → 이름 `banners` (또는 `SUPABASE_BANNERS_BUCKET` 과 동일).  
2. 광고 이미지 공개용이면 **Public bucket** 으로 생성.  
3. 기존 `schema.sql` 은 RLS로 anon 테이블 접근을 막습니다. 업로드는 **항상** `POST /api/ads/upload` (서버 + Service Role)만 사용합니다.

## 데이터 이전

기존 `articles.json` / `users.json` / `ads.json` 을 옮기려면 별도 스크립트 또는 CSV 복사가 필요합니다. (이 저장소에는 마이그레이션 스크립트를 포함하지 않았습니다.)
