# 테스트 기사 생성 로그 (김기목 기자)

## 스크립트

- 경로: `backend/scripts/seed-kimgimok-articles.mjs`
- 실행: 저장소 루트에서  
  `node backend/scripts/seed-kimgimok-articles.mjs`
- 저장 경로: **`articlesDb.insert`** → **`backend/data/articles.json`** (운영·로컬 동일 레이어)

## 생성 내용

| id | 제목(일부) | 카테고리 | 상태 | 기자명 |
|----|------------|----------|------|--------|
| 21 | 뉴스의창 신규 관리자 페이지 개편… | 경제-AI/IT | submitted | 김기목 |
| 22 | 지역 중소기업 디지털 전환 지원 확대… | 경제-금융 | submitted | 김기목 |

- `authorId`: `3`(기존 users.json 기자 계열과 맞춤; 표시명은 insert의 `authorName`으로 **김기목**)
- 본문: `content1`, `content2`에 자연스러운 테스트 문장

## 검증(신규 코드 로드 시)

동일 노드 프로세스에서 DB 모듈을 다시 읽으면 목록 상단에 id 21·22가 온다:

`node --input-type=module -e "import { articlesDb } from './backend/db/articles.js'; console.log(articlesDb.listPublishedForMain().slice(0,3));"`

## 운영 주의

- 운영 DB(또는 Render 디스크의 `articles.json`)에 반영하려면 **해당 환경에서 스크립트 실행** 또는 동일 payload로 API 송고.
- 로컬에서 시드 실행 시 `articles.json`이 변경되므로 커밋 전 백업·선택적 revert 권장.
