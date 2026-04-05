# 응답 본문 소실 지점 확정

## 결론 (A / B 중 택일)

**B. Render 백엔드 직접 호출은 정상 JSON( accessToken, role 포함 )이며, Vercel 프록시를 통해서만 클라이언트가 받는 HTTP 본문 길이가 0이 된다.**

→ **원인 구간:** `api/_sharedProxy.js` 가 **업스트림(fetch) 응답을 다운스트림(res)으로 전달하는 과정**과, 업스트림으로 **요청 헤더를 그대로 전달**하면서 생기는 **압축·Content-Length·Content-Encoding 불일치** 가능성이 높다. (백엔드 `auth` 라우트의 `res.json()` 미호출 문제는 **직접 URL 측정으로 반증됨**.)

## 증거 요약

1. `scripts/auth-dual-endpoint-check.js` 로 **동일 계정·동일 JSON body** 로 두 URL 호출.
2. **Render:** 매번 `rawLen` 200 ~ 300 대, `jsonParseOk: true`, `accessToken: true`, `role` 값 존재.
3. **Vercel:** 매번 `status: 200`, **`rawLen: 0`**, JSON 파싱 실패, 토큰·role 없음.

## 수정 (한 파일)

- 파일: `api/_sharedProxy.js`
- 내용: 업스트림 요청에 **`Accept-Encoding: identity`** 및 hop-by-hop/`content-length` 정리; 응답 전달 시 **`content-encoding` / `content-length` / `transfer-encoding` 을 원문 그대로 복사하지 않고**, 실제 전송 바이트 길이로 **`Content-Length` 재설정** 후 본문 전송.

## 배포 후 재확인

- 동일 스크립트로 Vercel 행의 `rawLen` > 0 및 `accessToken` / `role` 존재 확인.
- 브라우저에서 `nw-office/login.html` 로그인 후 역할별 HTML 이동 확인.
