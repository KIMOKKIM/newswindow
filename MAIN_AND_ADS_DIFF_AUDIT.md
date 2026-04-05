# 최근 변경점 비교 (메인·광고·기사 롤링)

## 분석 방법

- `git log` / `git diff origin/master -- script.js` 등 로컬 저장소 기준.

## 변경 파일 (관련만)

| 파일 | 요약 |
|------|------|
| `script.js` | `NW_CONFIG_API_ORIGIN`, `ARTICLES_API`, `renderTop5RotatorFromList`, `resolveArticleListThumb`, 정렬 필드에 `submitted_at` 반영 등 |
| `index.html` | `#nwTop5Rotator` 마크업·스타일 연동(레포 최신) |
| `scripts/vercel-build.mjs` | (기존) `NW_API_ORIGIN` / `NW_PUBLIC_UPLOAD_ORIGIN` 조건부 주입 |
| `admin/` | 광고·기사 UI, `VITE_API_ORIGIN` 의존 `api/client.js` |

## 변경 전 동작 (www 운영)

- `API_ORIGIN`이 로컬/사설망이 아니면 `''` → `ADS_API`, (주입 없을 때) `ARTICLES_API` 모두 동일 오리진.  
- Vercel에는 `/api/*` 백엔드 없음 → **기사 목록·광고 모두 실패 가능**.

## 변경 후 동작 (레포 의도)

- 빌드 시 `BACKEND_PUBLIC_URL` 등이 있으면 HTML 주입으로 `NW_API_ORIGIN` 설정 가능.  
- 주입이 빠진 배포에서는 여전히 실패.

## 이번 문제와의 관련성

- **직접적**: 기사 연동을 `ARTICLES_API = NW_CONFIG_API_ORIGIN \|\| ADS_API`로 두면서, **주입 실패 시 빈 베이스**가 되어 www에서 API가 깨짐.  
- **부수적**: 동일 `API_ORIGIN`으로 광고 fetch도 함께 실패 → 광고 영역 폴백.  
- **HTML**: 운영에 옛 `index.html`이 남아 있으면 롤링 DOM 부재로 롤링만 추가로 막힘.

## 본 작업에서의 코드 수정 (2경로)

1. **`script.js`**: 프로덕션 호스트에서 `API_ORIGIN`을 Render 백엔드로 고정 + `ensureNwTop5RotatorSection`.  
2. **`admin/src/api/client.js`**: 동일 호스트에서 런타임 폴백으로 Render API 사용.
