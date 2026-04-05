# sideLeftStack / sideRightStack `src` 생성·조회 흐름

## 1. 저장(관리자, Admin SPA)

- **파일:** `admin/src/pages/ads.js`
- 좌측/우측 **저장 버튼** → `readPair(app, 'sl' + i)` / `readPair(app, 'sr' + i)`  
  - `src`: 입력 `#sl0_src` 등 **텍스트 값** 또는 업로드 후 채워진 URL (`/api/ads/upload` 응답 `data.url`)
  - `href`: 링크 필드 정규화
- `apiFetch('/api/ads', { method: 'PUT', body: { sideLeftStack } })` 등으로 **부분 갱신**.

## 2. 저장(백엔드)

- **파일:** `backend/routes/ads.js` — `PUT /api/ads`
- `body.sideLeftStack` / `sideRightStack`이 배열이면 각 `{ src, href }`로 덮어쓰고 길이 패딩 후  
  `normalizeAdsResponse({ ...getDefaultAds(), ...current })` → **`saveAds(out)`** 로 **ads.json**(또는 `NW_ADS_JSON_PATH`)에 기록.

## 3. 디스크(ads.json) 실제 값

- 운영에서 관리자가 사이드 칸에 **URL·업로드를 넣지 않고 저장**하지 않으면, 스택은 기본값 **`src: ""`** 로 남음.
- 푸터는 **`footer[].image`** 필드로 따로 저장되므로, **푸터만 채워져 있고 사이드는 빈 문자열**인 상태가 될 수 있음.

## 4. 조회 `GET /api/ads`

1. `loadAds()` → 파일 파싱 후 `normalizeAdsResponse` (스택 길이·`sideLeft`→스택0 병합 등).
2. **공개 GET 한정:** 응답 복사본에 `applyPublicSideStackFallbackFromFooter(out)`  
   - 사이드 단일+스택 **모두 이미지 없을 때만** `footer[i].image` / `href`로 좌 0~3, 우 4~6 칸을 채움.  
   - **디스크 파일은 변경하지 않음.**
3. `res.json(out)`.

## 5. 운영에서 `src`가 비어 보였던 시점

- **ads.json(등)에 사이드 `src`가 비어 있음** (저장 경로 미사용).
- **`GET` 보강 로직이 배포되지 않은 빌드**에서는 2단계 보강 없이 그대로 빈 `src`가 내려감.
