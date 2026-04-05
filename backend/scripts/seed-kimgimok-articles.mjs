/**
 * 테스트 기사 2건을 articlesDb(= backend/data/articles.json)에 직접 반영.
 * 실행: repo 루트에서  node backend/scripts/seed-kimgimok-articles.mjs
 * 기자명: 김기목 · 상태: submitted(메인 공개 목록에 포함)
 */
import { articlesDb } from '../db/articles.js';

const reporterId = 3;

const rows = [
  {
    title: '뉴스의창 신규 관리자 페이지 개편, 기사 작성·송고·메인 노출 흐름 통합',
    subtitle: '단일 데이터 소스로 헤드라인·최신 롤링까지 연동',
    category: '경제-AI/IT',
    content1:
      '[뉴스의창=김기목 기자] 뉴스의창은 기사 작성 대시보드에서 송고한 기사가 메인 페이지 API를 통해 바로 반영되도록 연결 작업을 마쳤다. 편집·관리 화면과 독자용 메인이 동일한 저장소를 바라본다.',
    content2:
      '이번 개편으로 임시저장·송고 상태가 명확히 구분되며, 송고 완료 기사는 공개 목록에 포함돼 상단 최신 영역에 노출될 수 있게 됐다.',
    status: 'submitted',
    authorId: reporterId,
    authorName: '김기목',
  },
  {
    title: '지역 중소기업 디지털 전환 지원 확대…정책자금·컨설팅 패키지 주목',
    subtitle: '제조·서비스 업종 균형 배분',
    category: '경제-금융',
    content1:
      '[뉴스의창=김기목 기자] 정부가 지역 중소기업의 디지털 전환을 돕기 위해 정책자금과 전문 컨설팅을 묶은 패키지 지원을 내년 상반기부터 확대 운용한다는 방침이다.',
    content2:
      '업계에서는 현장 맞춤형 진단부터 실행까지 이어지는 원스톱 구조가 도입 효과를 높일지 주목하고 있다.',
    status: 'submitted',
    authorId: reporterId,
    authorName: '김기목',
  },
];

for (const r of rows) {
  const out = articlesDb.insert(r);
  console.log('inserted id=', out.id, 'title=', out.title?.slice(0, 40));
}
console.log('seed-kimgimok-articles: done. main feed uses same DB via GET /api/articles/public/list');
