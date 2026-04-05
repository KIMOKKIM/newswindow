# 직접 원인 (1개)

## 확정

**`footer fallback 로직 미반영(운영 배포)`**

- 저장소(`ads.json`)에는 원래부터 **`sideLeftStack` / `sideRightStack`의 `src`가 비어 있는 상태**였고, **`footer[].image`는 채워져 있음**(데이터 소스는 있음).
- 공개 `GET /api/ads`에서 이를 보강하는 `applyPublicSideStackFallbackFromFooter`가 **로컬에만 있고 원격 main에 커밋·Render 배포되지 않아**, 운영 응답에서 스택 `src`가 계속 빈 문자열로 내려갔다.

(근본적으로 스택이 비어 있는 **파일 상태**는 **저장 시 사이드 이미지 미기록**이지만, 푸터 데이터가 있는 상황에서 API가 비어 있다고 느껴진 직접 원인은 **보강 로직 미배포**이다.)
