# 운영 사용자 저장소 최종 감사

## 1. 운영 auth 가 읽는 저장소 (코드 확정)

- **애플리케이션 코드:** Express `backend/routes/auth.js` → `db.prepare(...).get(userid)`  
- **DB 어댑터:** `backend/db/db.js`  
  - 파일 경로: **`path.join(process.cwd(), 'data', 'users.json')`**

즉 **논리적 저장소 파일명은 항상 `data/users.json`** (프로세스 작업 디렉터리 기준).

## 2. 레포에 포함된 파일 vs Render 디스크

- 이 레포에는 **`backend/data/users.json`** 도 존재한다.  
- **Render 등에서 `process.cwd()` 가 `backend` 이면** 실제 파일은 **`backend/data/users.json`** 과 동일 구조의 **`backend` 폴더 아래 `data/users.json`** 이 된다.  
- **배포 시 레포의 `backend/data/users.json` 이 이미지에 복사되는지**, 아니면 **빈 디스크/이전 디스크**를 쓰는지는 **호스팅 설정에 따름** — 여기서는 코드만 확정한다.

## 3. 계정 존재 (레포 `backend/data/users.json` 기준)

| userid | 존재 | role |
|--------|------|------|
| teomok1 | 예 id 1 | editor_in_chief |
| teomok2 | 예 id 8 | reporter |
| admin1 | 예 id 9 | admin |

## 4. 비밀번호 일치 (로컬 bcrypt 검증, 커밋된 JSON 기준)

스크립트 `scripts/verify-staff-hashes.js` 결과 (갱신 후):

- `teomok1` / `teomok$123` → **bcrypt_ok=true**
- `teomok2` / `kim$8800811` → **bcrypt_ok=true**
- `admin1` / `teomok$123` → **bcrypt_ok=true**

**운영(Render) 디스크의 `users.json` 이 레포와 다르면** 위 해시는 운영에 반영되지 않는다. 이 경우 **같은 내용으로 운영 데이터를 맞추거나 재배포**해야 한다.
