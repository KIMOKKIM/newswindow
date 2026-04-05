# 최신기사 2열 UI — 운영 재검증 체크리스트

배포(Vercel 정적 + 동일 `script.js`·`styles.css`) 후 브라우저에서 확인한다.

- [ ] 최신기사 블록이 2열(넓은 화면) / 1열(좁은 화면)로 보이는가
- [ ] 좌측 대표 이미지가 실제 기사 썸네일(또는 placeholder)인가
- [ ] 3초마다 좌측만 전환되는가
- [ ] 우측에 최대 5개 제목·메타가 보이는가
- [ ] 롤링 인덱스와 우측 `is-active`가 일치하는가
- [ ] 좌·우 클릭 시 `article.html?id=…`로 이동하는가
- [ ] 좌우 사이드·하단 광고 영역이 기존과 동일한가
- [ ] 새로고침 후에도 동작하는가

## 스크린샷 (배포 후 저장 권장)

- `docs/screenshots/main-latest-hero-1.png`
- `docs/screenshots/main-latest-hero-2.png`
- `docs/screenshots/main-latest-right-list.png`
- `docs/screenshots/main-latest-full-layout.png`

*(자동 캡처는 이 저장소 작업 범위에서 생략 가능 — 운영에서 촬영.)*
