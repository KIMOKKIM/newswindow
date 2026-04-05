# 회귀 diff 매트릭스 (최근 커밋 기준)

## 비교 구간

- **기준 “성공 시점” 근사**: `80f9ae0` 직전 — `e67215c` (메인 카테고리 표시 소폭 수정)
- **“실패·회귀” 아카이브 시점**: `80f9ae0` — *Unify article meta display…*

## 파일별 요약

| 파일 | `80f9ae0`에서의 변화 | 최신기사·영속과의 관계 |
|------|----------------------|-------------------------|
| `script.js` | `nwLoadCategoryMap` 추가, **`DOMContentLoaded` 전체를 콜백으로 감쌈**, `displayCategory`→JSON 맵, 상세 메타 변경 | **직접**: 초기화 지연 + (서브도메인 시) API base 빈 문자열 가능 |
| `public/script.js` | 동일 | 동일 |
| `index.html` / `public/index.html` | 해당 커밋에서 **변경 없음** (git 기준) | 간접만 (스크립트 동작 변화) |
| `styles.css` / `public/styles.css` | 상세 메타 flex | 최신기사 실패 무관 |
| `backend/config/dataPaths.js` | 변경 없음 | 기본 fallback 동작 유지 |
| `backend/db/articles.js` | 변경 없음 | — |
| `backend/routes/ads.js` | 변경 없음 | — |
| `backend/server.js` | 변경 없음 | 본 작업 전까지 영속 **강제 없음** |
| `render.yaml` | 변경 없음 | 의도된 디스크+env; 실서비스 미적용 시 유실 |

## 결론 (회귀 소스 커밋)

- **프론트 최신기사/초기화 회귀**는 **`80f9ae0`의 `script.js` / `public/script.js`** 변경과 가장 일치.
- **데이터 유실**은 동일 커밋과 무관하게 **배포 시 `NW_*` 미설정**이면 구조적으로 발생 가능; 커밋 `80f9ae0`은 백엔드 영속 로직을 바꾸지 않음.
