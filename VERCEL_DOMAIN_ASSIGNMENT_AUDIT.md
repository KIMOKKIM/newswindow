> **구버전 경고 (2026)**: 이 문서는 과거 **로컬 JSON / NW_* 경로** 전제 하의 감사·설정 기록일 수 있습니다. **현재 운영은 Supabase 단일화**입니다. 절차·환경변수는 [SUPABASE_ENV.md](./SUPABASE_ENV.md), [OPERATIONS_RENDER_VERCEL_CHECKLIST.md](./OPERATIONS_RENDER_VERCEL_CHECKLIST.md)를 따르세요.

# Vercel Domain assignment audit

## 이 문서의 한계 (중요)

**도메인이 “어느 deployment id에 붙는지”는 Vercel Project → Domains / Deployment 상세에만 정확히 표시된다.**  
이 에이전트는 대시보드에 접근할 수 없어 **연결 대상 deployment 이름·id·커밋 SHA를 확정하지 못했다.**

---

## HTTP로만 확인한 사실 (DNS / 라우팅 일부)

| 호스트 | 경로 | 관측 |
|--------|------|------|
| `newswindow.kr` | `/api/health` | **307** → `Location: https://www.newswindow.kr/api/health` |
| `www.newswindow.kr` | `/api/health` | **404** (이전·현재 점검과 동일 패턴; 본문은 빈 응답 케이스 있음) |

apex → www 리다이렉트는 **Vercel이 응답** (`Server: Vercel`).  
**어느 deployment 카드에 Domains 가 매핑되는지**는 위 정보만으로는 알 수 없다.

---

## 대시보드에서 직접 확인할 체크리스트 (소유자 작업)

1. **Vercel Project → Settings → Domains** (또는 **Domains** 탭)
2. 각 행에 대해 기록:
   - `newswindow.kr` → **Assigned to** / **Environment** (Production / Preview)
   - `www.newswindow.kr` → 동일
3. **Project → Deployments**
   - **Production** 으로 표시된 최상단 배포의 **Deployment URL** (`.vercel.app`), **Commit**, **상태**
4. 불일치 점검:
   - Domains 화면에 “Invalid Configuration” / 다른 프로젝트 경고가 있는지
   - Production 배포가 **오래된 커밋**에 고정되어 있지 않은지 (롤백 여부)

### 소유자 기입란

| 도메인 | Environment | 연결된 Deployment 이름 또는 ID | 해당 배포 Commit (short SHA) |
|--------|---------------|-----------------------------------|------------------------------|
| newswindow.kr | | | |
| www.newswindow.kr | | | |

| Latest Production deployment (대시보드 최상단) | .vercel.app URL | Commit | Domains 와 동일 배포인가 (Y/N) |
|--------------------------------------------------|-----------------|--------|----------------------------------|
| | | | |

---

## Alias / assignment mismatch 여부

**대시보드 값 채우기 전에는 “mismatch 여부”를 확정하지 않는다.**
