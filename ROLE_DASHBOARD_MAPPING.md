# 역할 ↔ 대시보드 URL 매핑

| 계정(예) | `role` (DB/응답) | 대시보드 파일 | 운영 URL (동일 경로) |
|----------|------------------|---------------|----------------------|
| admin1 | `admin` | `nw-office/admin.html` | `https://www.newswindow.kr/nw-office/admin.html` |
| teomok1 | `editor_in_chief` | `nw-office/editor.html` | `…/nw-office/editor.html` |
| teomok2 | `reporter` | `nw-office/reporter.html` | `…/nw-office/reporter.html` |

## 파일 존재

- 위 세 HTML 은 저장소 `nw-office/` 에 존재한다.

## 대시보드 로드 시 auth (요약)

- 각 대시보드 스크립트가 `localStorage.getItem('accessToken')`, `localStorage.getItem('role')` 로 검사.
- 예: `admin.html` 은 `role !== 'admin'` 이면 `login.html?role=admin` 으로 돌려보냄.
