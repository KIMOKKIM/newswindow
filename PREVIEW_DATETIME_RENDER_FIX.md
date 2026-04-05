# 미리보기 날짜·시간 렌더링 수정 요약

## 변경 파일 (1개)

- `admin/src/pages/articleForm.js`

## 내용

- `formatDateYmd`(날짜만) 제거 대신 `formatArticleDateTimeForPreview(raw)` 추가.
  - **역할:** API **원본** 문자열 → 미리보기 **표시** 문자열 `YYYY-MM-DD HH:mm:ss`.
  - 파싱 실패 시: 이미 `YYYY-MM-DD HH:mm:ss` 형태면 그대로; 날짜만이면 ` 00:00:00` 보정; 그 외는 trim된 원문 또는 `—`.
- 미리보기 메타:
  - 발행: `published_at`이 비어 있지 않으면 그 값, 아니면 `created_at`.
  - 수정: `updated_at`이 비어 있지 않으면 그 값, 아니면 `created_at`.

## 저장 로직

- 변경 없음 (표시 전용).
