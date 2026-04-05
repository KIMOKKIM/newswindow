# `api/_sharedProxy.js` — upstream body downstream 전달 원칙 (커밋 `1fd24f2`)

## 강제된 동작

1. **Upstream 읽기**  
   - `const r = await fetch(target, opts)` 후 `await r.arrayBuffer()`로 응답 본문을 **끝까지** 읽는다.  
   - `Buffer.from(ab)`로 다운스트림에 넘길 버퍼를 만든다.

2. **Downstream 쓰기**  
   - 실제 읽은 바이트를 **`res.end(buf)`** 한 번으로 보낸다.  
   - **`Content-Length`** 는 **`String(buf.byteLength)`** 만 사용한다 (upstream 값 복사 안 함).

3. **복사하지 않는 upstream 헤더**  
   - `transfer-encoding`, `content-encoding`, `content-length`, `connection`, **`content-type`** 은 `r.headers` 순회 시 건너뛴다.  
   - 압축/길이 불일치로 인한 빈 본문·클라이언트 오해석을 막는다.

4. **Content-Type**  
   - `r.headers.get('content-type')` 이 비어 있지 않으면 그 값을 사용한다.  
   - 없으면 **`application/json; charset=utf-8`** 로 설정한다.

5. **Upstream 요청**  
   - 클라이언트에서 넘어온 `content-length` / `transfer-encoding` 은 제거한다.  
   - **`accept-encoding: identity`** 를 설정해 upstream 이 불필요한 압축을 붙이지 않게 한다.

6. **로그 (Vercel Functions 로그)**  
   - **`[proxy] empty_upstream_body`**: 본문 길이 0일 때 `path`, `target`, `upstreamStatus`, `contentType` JSON.  
   - **`[proxy] upstream_body_not_json`**: `Content-Type` 이 JSON으로 간주될 때 파싱 실패 시 `preview` 최대 400자.  
   - **`[proxy] fetch_failed`**: `fetch` 예외 시 `path`, `target`, `message`.

7. **예외 응답**  
   - `fetch` 실패 시 `500` + `{ error: 'proxy_error', message: ... }` (JSON).

## 참고

- `/api/health` 와 `BACKEND_URL` 미설정 분기는 기존과 동일하며, 본 감사 범위는 **일반 프록시 본문 전달**이다.
