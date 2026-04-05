# 기사 유실·덮어쓰기 감사

## 단일 저장소

- 모든 위 API는 **같은 `articles` 배열**(파일 경로는 `NW_ARTICLES_JSON_PATH` 또는 기본 `backend/data/articles.json`)을 읽는다.
- **캐시**: `public/list`, `public/:id` 는 `no-store` 헤더를 둔다. 그래도 **브라우저 탭·서비스워커·중간 캐시**는 별도 점검.

## 유실(Delete) vs 상태 변경

- **실제 유실**: JSON 배열에서 `id` 행이 없어지면 목록·대시보드·상세 **모두**에서 사라져야 한다.  
  “메인에만 남음”이면 **클라이언트 구목록** 또는 **다른 호스트의 API** 가능성이 더 큼.
- **덮어쓰기**: `save()` 가 전체 배열을 파일에 쓴다. 동시 쓰기·디스크 오류는 `atomicJsonWrite` 로 일부緩和(배포본에 포함 시).

## 배포와 데이터

- 에페메럴 디스크에 JSON을 두면 **재배포 시 리포 초기 상태로 돌아갈 수 있음** → “전부 사라짐” 패턴.  
  지속 디스크 + `NW_ARTICLES_JSON_PATH` 는 `DEPLOY_DATA_PERSISTENCE_REPORT.md` 참고.

## ID 변경

- `insert` 시 `max(id)+1` 로 부여. 사용자가 말하는 “id”가 URL 과 list 의 숫자와 일치하는지 네트워크에서 확인.
