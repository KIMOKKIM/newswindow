# F5 후 최신기사 화면이 늦게 바뀌는 직접 원인

## 확정된 동작 (수정 전)

1. **`#nwLatestTop5`** 에 `style="display: none"` 이 있어, 첫 페인트에서는 2열 최신기사 블록이 **보이지 않음**.
2. **`.headline-section`** 은 정적 HTML(예전 샘플 제목·리스트)이 그대로 노출됨 → 사용자는 이것을 “예전 최신기사 UI”로 인지.
3. **`/api/articles/public/list`** fetch가 완료된 뒤 `renderLatestTop5FromList`가 `sec.style.display = ''` 로 2열을 켜고 `setHeadlineSectionVisible(false)` 로 헤드라인을 숨김.
4. **지연 시간(수 초)** 은 주로 **API 응답 대기**(Render cold start, 네트워크)에 해당하며, `setTimeout(5000)` 같은 고정 지연은 코드에 없음.
5. **구형 블록 “교체”** 는 JS가 DOM을 갈아끼운 것이 아니라, **처음부터 보이던 것이 헤드라인 정적 마크업**이고, **숨겨져 있던 것이 #nwLatestTop5** 였음.

## 결론

**직접 원인 1개:** `#nwLatestTop5` 가 초기에 숨겨져 있고, 데이터 도착 전까지 `.headline-section` 샘플만 보이다가 fetch 이후에야 2열이 표시되도록 설계되어 있었음.
