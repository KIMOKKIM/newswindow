> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 직접 원인 확정 (각 1개)

## A. 최신기사 실패·전체 에러 문구

**확정 원인(프론트, 복합 중 직접 트리거):**

1. (회귀 커밋 `80f9ae0`) **`nwLoadCategoryMap`이 `DOMContentLoaded`의 전체 본문을 게이트** — 기사·광고 fetch 및 Top5 렌더가 카테고리 `fetch` 완료 후에만 실행됨.  
2. 같은 시기 코드에서 **`www`/`newswindow.kr` 이외의 `*.newswindow.kr` 에서 `API_ORIGIN` 이 빈 문자열**이 되면 `GET /api/articles/public/list` 가 **프론트 호스트로 상대 요청**되어 실패·JSON 파싱 에러로 **동일한 catch** 실행 → 좌측 히어로·우측 리스트가 **같은 실패 경로**로 묶임.

실제 사용자 호스트가 www 단독이면 (1)만으로도 “가끔/느리게 안 뜸”, 서브도메인이면 (2)로 **항상** 실패 가능.

## B. 기사·광고 저장 영속성

**확정 원인:**

- **운영 인스턴스가 `NW_ARTICLES_JSON_PATH` / `NW_ADS_JSON_PATH` 없이 기본 `backend/data/*.json`(또는 사본)에 쓰고, Render 에페메럴 디스크만 쓰는 구성**이면 재배포·재시작 시 **저장 내용이 유지되지 않음** (`dataPaths.js` + 진단 모듈 설명과 일치).

Blueprint(`render.yaml`)와 실제 서비스 설정이 **불일치**하면 동일 증상이 반복된다.
