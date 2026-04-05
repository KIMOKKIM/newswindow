# 운영 경로(/admin) 연결 점검 보고서

## A. 프론트 앱(빌드) 자체

| 항목 | 결과 |
|------|------|
| Vite 빌드 | `admin/`에서 `npm run build` 성공. `admin/dist/index.html`, `admin/dist/assets/*` 생성됨. |
| 라우트 포함 | 클라이언트 라우터(`admin/src/router.js`)가 번들에 포함되며, 경로는 **상대 경로** `/admin/...`만 사용. |
| `base` | `vite.config.js`의 `base: '/admin/'`로 정적 자산은 `/admin/assets/...`로 참조됨. |

**결론 (A):** 리포지토리 기준 SPA 빌드 산출물은 정상이며, “앱 코드만 빠졌다”는 형태의 문제는 아님.

---

## B. 서버·배포 라우팅 (실측)

### 실측 (2026-04-01, `curl -sI`)

1. **`https://newswindow.kr/admin`**
   - `HTTP/1.1 307 Temporary Redirect`
   - `Location: https://www.newswindow.kr/admin`
   - `Server: Vercel`

2. **`https://www.newswindow.kr/admin`**
   - `HTTP/1.1 404 Not Found`
   - `Server: Vercel`
   - `X-Vercel-Error: NOT_FOUND`

**정리:** apex는 www로 리다이렉트되지만, **www에서 `/admin` 경로에 매핑된 배포 자산이 없어 404**로 끝남. 이는 **프론트 번들 로직이 아니라 호스팅(라우트/리라이트/배포 디렉터리) 이슈**로 분리할 수 있음.

### SPA에서 흔한 요구사항

`/admin` 및 `/admin/*` 직접 URL 접근 시, 정적 서버가 파일 경로만 찾다가 404를 내지 않도록:

- `/admin` → `admin/dist/index.html` (또는 동일 내용의 엔트리) 서빙
- `/admin/reporter/dashboard` 등 **모든 하위 경로**도 동일 `index.html`로 **fallback** (Express는 본 repo `backend/server.js`에서 `admin/dist` 존재 시 이미 유사 처리).

**Vercel 예시 (개념):** `vercel.json` 등에서 `/admin/*` → `/admin/index.html` 리라이트, 또는 Admin SPA를 `outDir` 루트에 맞게 배포하고 rewrites 설정. (실제 프로젝트의 루트 정적 사이트 구조에 맞춰 조정 필요.)

---

## C. API vs 페이지 경로 혼동

| 구분 | 권장 |
|------|------|
| 페이지 | 항상 **현재 사이트 origin** + 상대 경로 `/admin/...` (本 앱은 이 패턴 유지). |
| API | 동일 origin이면 `/api/...`; 별도 백엔드면 CORS·프록시 설정 필요. |

**newswindow.kr가 Vercel 정적만 제공**하고 Node API가 같은 도메인에 없다면, 브라우저에서 `/api` 호출은 **별도** 백엔드 URL 또는 프록시 설정 없이는 실패할 수 있음. 이는 “페이지 404”와는 별개로 **두 번째 운영 이슈**임.

---

## newswindow.kr/admin이 “먹통”으로 보이는 원인 (요약)

| 원인 유형 | 해당 여부 | 설명 |
|-----------|-----------|------|
| 프론트 소스에 `/admin` 라우트 없음 | **아님** | 빌드·라우터 존재. |
| 빌드 산출물 미배포 | **가능** | Vercel 404는 **해당 경로에 배포된 파일이 없음**을 의미. |
| SPA fallback 미설정 | **가능** | 배포는 되었지만 `/admin/*`가 index로 안 돌아가면 직링크 접속 시 404. (현재 HEAD는 `/admin` 자체가 404.) |
| 도메인만 연결되고 API 미연결 | **가능** (별도) | 페이지가 뜬 뒤에도 로그인/API 실패 가능. |

**최종 판단:** `https://www.newswindow.kr/admin` **404는 코드 레포의 React/Vite 라우팅 버그라기보다, Vercel(또는 앞단)에서 `/admin`에 대한 정적 리소스·rewrite가 준비되지 않은 배포 이슈**에 해당. 코드에서 추가로 할 일은 “빌드 후 해당 호스트의 `/admin`으로 배포 + SPA rewrites”를 만족시키는 쪽에 가깝다.
