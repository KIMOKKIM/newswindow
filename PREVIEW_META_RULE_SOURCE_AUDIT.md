> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# 미리보기 메타 표시 규칙 추적 (Source of truth)

## 단일 규칙 모듈

| 파일 | 역할 |
|------|------|
| `shared/articleMetaFormat.js` | `categoryLabelForValue`, `reporterDisplayName`, `formatArticleMetaDateYmd` 정의 |
| `shared/articleCategories.json` | `value` → `label` 매핑 (예: `경제-금융` → `금융`) |

## 미리보기 UI에서의 사용

| 파일 | 용도 |
|------|------|
| `admin/src/pages/articlePreview.js` | 전체 페이지 미리보기: `catShown`, `byline`, `metaBar` (`nw-prev-meta-cat` / `nw-prev-meta-byline`) |
| `admin/src/pages/articleForm.js` | 작성 폼 내 모달 미리보기: 동일 헬퍼로 `catShown`, 발행일·수정일 문자열 생성 |

## 표시 규칙 (코드와 동일)

1. **카테고리**: `categoryLabelForValue(trim(category))` — JSON에 없으면 저장 원문 그대로.
2. **기자**: `reporterDisplayName(author_name)` — 빈 값이면 `"기자"`; 이미 `…기자`로 끝나면 그대로; 아니면 `"이름 기자"`.
3. **날짜**: `formatArticleMetaDateYmd` — 파싱 성공 시 `YYYY-MM-DD`, 실패 시 원문 앞 10자 또는 `—`.
4. **바이라인 문자열**: `{reporterDisplayName} · 발행일 {ymd(published_at||created_at)} · 수정일 {ymd(updated_at||created_at)}` (`articlePreview.js` 81–86행과 동일).

## 날짜·필드 출처

- `published_at`, `updated_at`, `created_at`, `category`, `author_name` — API/폼 state의 기사 객체 필드 (저장값 변경 없음).
