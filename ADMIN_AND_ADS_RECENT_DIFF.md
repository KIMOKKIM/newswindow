> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 최근 변경점 비교 (admin 경로·광고, 운영 문제 연관)

기준: 저장소 `git log`(약 최근 48시간~admin 도입 구간)와 해당 커밋의 파일 내용.

---

## 1. `admin/src/router.js` — 포털(`/admin`) 처리

| 항목 | 내용 |
|------|------|
| **변경 파일** | `admin/src/router.js` |
| **변경 전 동작** (예: 커밋 `c115f1d` 도입 시) | `route.name === 'portal'`이고 `getSession()`이 있으면 `nav(dashboardPathForRole(session.role), { replace: true })` 후 `return`. 관리자면 **`/admin/admin/dashboard`**로 즉시 치환. |
| **변경 후 동작** (현재 워킹 트리) | 포털에서는 **세션 유무와 관계없이** `renderPortal`만 호출하고 URL은 **`/admin`**에 둠. |
| **이번 문제와의 관련성** | **문제 1 직접 원인**: “스태프 로그인으로 `/admin` 들어왔는데 곧바로 `/admin/admin/dashboard`” 현상은 이 블록 + `dashboardPathForRole('admin') === '/admin/admin/dashboard'` 조합으로 설명됨. |

인용(변경 전, `c115f1d`):

```javascript
  if (route.name === 'portal') {
    if (session) {
      await nav(dashboardPathForRole(session.role), { replace: true });
      return;
    }
    await renderPortal(root, { navigate: nav });
    return;
  }
```

---

## 2. `admin/src/auth/session.js` — 대시보드 경로

| 항목 | 내용 |
|------|------|
| **변경 파일** | `admin/src/auth/session.js` (최근 diff에서 경로 상수 변경 커밋은 목록에 없음 — `c115f1d`부터 존재) |
| **변경 전/후** | 관리자 대시보드는 도입 시점부터 **`/admin/admin/dashboard`** (역할 세그먼트 `admin`; Vite `base: '/admin/'`와 다른 개념). |
| **이번 문제와의 관련성** | 포털 자동 치환이 있을 때 최종 URL의 **두 번째 `admin`**을 만드는 값. basename 이중 결합이 아님. |

---

## 3. `admin/vite.config.js` — `base`

| 항목 | 내용 |
|------|------|
| **변경 파일** | `admin/vite.config.js` (`c115f1d`: `base: '/admin/'`) |
| **동작** | 정적 자산 base URL. SPA 라우팅의 `navigate()`는 별도로 **`/admin/...` 절대 path** 사용. |
| **이번 문제와의 관련성** | **`/admin/admin/dashboard`의 직접 원인 아님** (이중 prefix가 아니라 역을 `/admin/.../dashboard`로 쓰는 설계). |

---

## 4. 광고 — `backend/routes/ads.js` 및 프론트

| 항목 | 내용 |
|------|------|
| **변경 파일 (커밋 이력 예)** | `0606013`, `7ef118e` — href 정규화; `cb50e15` — 메인 동기·캐시·업로드 URL; `346256f` — 대시보드 UI 저장 버튼; `dfc454a` — 업로드/프록시 등 |
| **변경 전 동작** | `GET/PUT /api/ads` + **`backend/data/ads.json`** (또는 동일 경로)에 read/write. |
| **변경 후 동작** | 위 API·파일 저장 모델은 동일. **워킹 트리 추가**: `NW_ADS_JSON_PATH` 설정 시 해당 절대 경로 파일 사용 + `saveAds` 시 디렉터리 `mkdir`. |
| **이번 문제와의 관련성** | **문제 2**: 저장은 파일에 되지만 **호스트 디스크가 비영속**이면 재배포 후 내용 소실. 조회 키 분기가 아니라 **저장소 영속성** 이슈. |

---

## 5. 푸터 스태프 링크 (`index.html` 등)

| 항목 | 내용 |
|------|------|
| **변경 파일** | `570995c` — `index.html`, `login.html` (스태프 로그인 위치) |
| **변경 전/후** | 링크 대상은 `/admin` 계열 유지; **문제 1은 링크 변경이 아니라 admin SPA 내부 포털 리다이렉트**가 원인. |

---

## 6. localStorage / 엔드포인트

| 항목 | 내용 |
|------|------|
| **광고 데이터** | 광고 슬롯 본문은 **localStorage가 아님** → `PUT/GET /api/ads` + 서버 파일. |
| **admin 세션** | `nw_admin_session_v1` (JWT). 포털 치환 제거 후에도 대시보드 직접 입장 시 동일 세션 사용. |
