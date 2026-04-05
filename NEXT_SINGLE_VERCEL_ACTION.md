# Next single Vercel action

## 전제

- **BACKEND_URL / Render** 논의는 하지 않는다.
- **대시보드에 접근하지 못하는 주체**는 “도메인이 어느 deployment에 붙었는지”“Production에 함수가 있는지”를 **확정할 수 없다**.

---

## 단일 최우선 조치 (하나)

**Vercel 대시보드에서 Production 배포 한 건을 연 다음, 그 화면의 Functions(또는 Serverless Functions) 섹션에 `api/[...path]` 가 실제로 나열되는지 확인한다.**

- **나열됨** → 그다음에만 Domains 가 그 배포(또는 그 프로젝트의 Production 엔트리)를 가리키는지 Domains 탭에서 대조한다.
- **나열되지 않음** → **코드가 아니라 배포 산출물 문제**이므로, 해당 저장소 커밋이 `api/[...path].js` 를 포함하는 상태에서 **Production 재배포**가 선행된다. Domains 재지정만으로는 함수가 생기지 않는다.

이 한 가지(“Production deployment 상세에서 Functions 존재 확인”)를 **모든 다른 조치(보호 해제, 도메인 재부여)보다 먼저** 수행해야 이후 단일 조치를 거짓 없이 한 줄로 고를 수 있다.

---

## “확정된 다음 한 줄”은 대시보드 결과 후

아래 중 **실제로 대시보드에서 관측된 상황에 맞는 한 줄만** 남기도록 한다 (지금은 채우지 않음).

- Preview URL 검증만 필요: Deployment Protection / bypass 조정
- Production에 함수 없음: 동일 브랜치·커밋으로 Production **재배포**
- 함수 있는데 도메인이 다른 배포를 봄: **Domains / Production 할당** 정정

**현 시점에서 위 셋 중 무엇이 진짜인지는 대시보드 없이 확정하지 않았다.**
