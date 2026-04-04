# 루트 · Admin 프로덕션 재검증

## 배포 커밋

- `e119a2a` — `public/`에 루트 메인 정적 파일 복사 추가 후 `master` 푸시.
- 검증 시각(UTC): 응답 헤더 `Date` 약 `Sat, 04 Apr 2026 06:14:31 GMT` 이후.

## 측정 방법

- `curl.exe -sL -w` 로 **최종 URL**·**HTTP 코드** 확인.
- `curl.exe -sI` 로 `https://www.newswindow.kr/styles.css` 및 `.../images/logo-header-tight.png` **200** 확인.

## URL별 결과

| URL | Status | 최종 URL | 페이지 제목(소스 기준) | 구분 | 404 여부 |
|-----|--------|----------|------------------------|------|----------|
| https://newswindow.kr/ | 200 | https://www.newswindow.kr/ | 뉴스의창 - 인터넷 신문 | 메인 | 아니오 |
| https://www.newswindow.kr/ | 200 | https://www.newswindow.kr/ | 뉴스의창 - 인터넷 신문 | 메인 | 아니오 |
| https://newswindow.kr/admin | 200 | https://www.newswindow.kr/admin | 뉴스의창 관리 | admin | 아니오 |
| https://www.newswindow.kr/admin | 200 | https://www.newswindow.kr/admin | 뉴스의창 관리 | admin | 아니오 |
| https://newswindow.kr/index.html | 200 | https://www.newswindow.kr/index.html | 뉴스의창 - 인터넷 신문 | 메인 | 아니오 |
| https://newswindow.kr/admin/index.html | 200 | https://www.newswindow.kr/admin/index.html | 뉴스의창 관리 | admin | 아니오 |

## 리다이렉트

- `newswindow.kr` → `www.newswindow.kr` 로 **307** 후 위 최종 URL에서 200.

## 공존

- `/`·`/index.html`(메인)과 `/admin`·`/admin/index.html`(admin) **동시 200** 확인.

## 참고

- 디렉터리 URL `https://www.newswindow.kr/admin/assets/` 는 **404**(정적 호스트에서 폴더 인덱스 없음). 실제 번들은 `.../admin/assets/<파일명>` 경로로 200.
