# /admin 라우트 검증 로그 (프로덕션 실측)

측정 시각: 2026-04-04 (UTC 기준 응답 `Date` 헤더 참고)  
도구: Windows `curl.exe -sI` / `curl.exe -s`  
참고: `index-58B7bRqQ.js` 는 **로컬** `admin/dist/index.html` 이 참조하는 번들 파일명(프로덕션 빌드 해시와 다를 수 있음 — 동일 404면 산출물 자체 없음으로 해석).

## URL별 기록

### https://newswindow.kr/admin

| 필드 | 값 |
|------|-----|
| status | **307** |
| 최종 URL | `Location: https://www.newswindow.kr/admin` (리다이렉트) |
| body/제목 | (HEAD만 수행) |
| 신규 admin | 아니오 (최종 www에서 별도 확인) |
| 404 | 리다이렉트 자체는 307 |

### https://www.newswindow.kr/admin

| 필드 | 값 |
|------|-----|
| status | **404** |
| 최종 URL | `https://www.newswindow.kr/admin` |
| body 일부 | `The page could not be found` / `NOT_FOUND` / `icn1::…` |
| 페이지 제목 | 없음 (플레인 텍스트 오류 본문) |
| 신규 admin | **아니오** |
| 404 | **예** (`X-Vercel-Error: NOT_FOUND`) |

### https://newswindow.kr/admin/index.html

| 필드 | 값 |
|------|-----|
| status | **307** |
| 최종 URL | `Location: https://www.newswindow.kr/admin/index.html` |
| 신규 admin | www에서 확인 |
| 404 | 307 |

### https://www.newswindow.kr/admin/index.html

| 필드 | 값 |
|------|-----|
| status | **404** |
| 최종 URL | `https://www.newswindow.kr/admin/index.html` |
| 신규 admin | **아니오** |
| 404 | **예** |

### 번들 (로컬 dist 기준) https://www.newswindow.kr/admin/assets/index-58B7bRqQ.js

| 필드 | 값 |
|------|-----|
| status | **404** |
| 신규 admin | **아니오** |
| 404 | **예** |

## 이전에 기록했던 “수정 배포 후” 표

아직 **Git에 빌드 스크립트가 반영·배포되지 않은 상태**이므로, 배포 후 표는 비워 두었음. **커밋·푸시·재배포 후** 동일 명령으로 갱신할 것.
