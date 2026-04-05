# 프록시 수정 배포 상태

## 커밋

| 항목 | 값 |
|------|-----|
| **프록시 수정 커밋 (전체 해시)** | `1fd24f2639ac8b1757cf6754137edaa43b041085` |
| **짧은 메시지** | `fix(proxy): safe response headers, content-type fallback, upstream body logs` |
| **변경 파일** | `api/_sharedProxy.js` |

## Git / 브랜치

- `git push origin master`: **완료** (`f2802ea` → `1fd24f2`).
- 로컬 `master`와 `origin/master`는 이 커밋 기준으로 동기화됨(프록시 파일만 해당 커밋에 포함).

## Vercel production 반영

- 이 저장소의 `master` 푸시는 연결된 Vercel 프로젝트에 **자동 Production 배포**를 트리거하는 구성으로 가정된다.
- **운영 재검증** (`scripts/auth-dual-endpoint-check.js`): 푸시 직후 **초기 실행**에서는 Vercel이 여전히 `rawLen: 0`이었고, **약 45초 대기 후 재실행**에서 Vercel 응답 본문 길이가 Render와 일치함을 확인했다 → **Latest production에 `1fd24f2` 프록시 동작이 반영된 것으로 판단**한다.
- Vercel Dashboard에서 **Production deployment**의 **커밋 SHA**가 `1fd24f2…`와 일치하는지 한 번 더 확인하는 것을 권장한다.
