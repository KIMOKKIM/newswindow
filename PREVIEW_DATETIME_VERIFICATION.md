# 미리보기 날짜·시간 검증

## 수동 확인 항목

1. 기사 작성(또는 수정) 화면에서 **미리보기** 클릭.
2. 발행일 · 수정일에 **시:분:초**가 `YYYY-MM-DD HH:mm:ss` 형태로 보이는지.
3. 신규 작성 등 `article`이 없는 경우: 기존과 같이 `—` 유지.
4. 기타 메타(카테고리, 바이라인, 본문/이미지) 표시 이상 없음.

## 스크린샷 (선택)

- `docs/screenshots/preview-datetime-before.png` — 변경 전(참고용)
- `docs/screenshots/preview-datetime-after.png` — 변경 후

## 자동/대체 검증

- 저장 API 스키마와 필드명 일치 여부는 `PREVIEW_DATETIME_SOURCE_AUDIT.md`의 백엔드 참조로 확인.
