# 루트 `/` 404 — 직접 원인 1개 (확정)

## 사용자 제공 후보 중 선택

**확정 분류: 루트 `index.html` 누락** (배포 정적 출력에 해당 파일이 없음)

## 근거 (추측 없이)

1. `https://www.newswindow.kr/` 및 `https://www.newswindow.kr/index.html` 응답: **404**, `X-Vercel-Error: NOT_FOUND`.
2. 메인 HTML 소스는 Git 기준 **저장소 루트 `index.html`** 에 존재.
3. 수정 전 `vercel-build`는 **`public/admin/`만** 채움 — **`public/index.html`을 생성/복사하지 않음**.
4. 동일 시점 `https://www.newswindow.kr/admin` 은 **200** — `public/admin/` 경로의 산출물은 배포에 포함됨.

## 한 줄 요약

**빌드 산출물이 `public/` 기준으로 배포되는데, 메인 `index.html`(및 동반 정적 자산)이 `public/`에 들어가지 않아 루트 경로가 404였다.**
