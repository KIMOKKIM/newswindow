# Production deployment — function 포함 여부 감사

## 이 문서의 한계 (중요)

**Latest production deployment의 커밋 id, Functions 탭, Build log 전문은 Vercel 대시보드(또는 `vercel inspect` 등 인증된 CLI)에서만 확정 가능하다.**  
이 환경에서 Vercel CLI는 **미로그인 상태**였다.

---

## 레포 쪽 사실 (git — 배포 여부와는 별개)

| 항목 | 내용 |
|------|------|
| API 라우트 소스 | 저장소 루트 `api/[...path].js` 가 존재하며 일반적으로 **git tracked** 라는 전제는 사용자가 확정함 |
| 실제 프로덕션 빌드에 포함되었는지 | **배포 산출물·대시보드 확인 전까지 미확정** |

---

## 대시보드에서 직접 확인할 체크리스트 (소유자 작업)

1. **Project → Deployments**
2. **Production** 라벨이 붙은 **가장 최근 성공 배포** 클릭
3. 기록:
   - **Commit** (전체 SHA 또는 short)
   - **Build Logs** 안에 `api/` 또는 `api/[...path]` 관련 빌드·번들 로그가 있는지
4. 같은 deployment 상세에서:
   - **Functions** / **Serverless Functions** 섹션에 **`api/[...path]`** 또는 유사 엔드포인트가 **목록에 표시되는지**
5. (선택) **Runtime Logs**에서 `/api/health` 요청이 함수에 도달하는지

### 소유자 기입란

| 항목 | 값 |
|------|-----|
| Latest Production deployment URL (`.vercel.app`) | |
| Commit SHA | |
| Functions 목록에 `api/[...path]` 표시 | Y / N |
| Build log에 function 빌드 흔적 | Y / N / 확인 안 함 |

---

## 이 에이전트가 HTTP로 본 것과의 관계 (추측 아님)

`www.newswindow.kr/api/health` 가 **404**이고 헤더에 **`X-Render-Origin-Server: Render`**, **`X-Powered-By: Express`** 가 붙은 적이 있다.  
이것이 **“Vercel Functions 목록이 비어 있다”**와 동치인지는 **대시보드 Functions 탭 없이는 확정할 수 없다** (다른 라우팅/프록시 구성도 같은 헤더를 만들 수 있기 때문).
