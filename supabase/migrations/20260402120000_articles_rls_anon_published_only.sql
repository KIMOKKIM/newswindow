-- 기존 DB: 익명 PostgREST 클라이언트가 articles 전체를 막던 정책을,
-- status 가 published/approved 인 행만 읽도록 교체합니다.
-- (앱 백엔드는 service_role 이므로 영향 없음.)

DROP POLICY IF EXISTS "deny_all_anon_articles" ON public.articles;

DROP POLICY IF EXISTS "articles_anon_select_published_only" ON public.articles;

CREATE POLICY "articles_anon_select_published_only"
ON public.articles
FOR SELECT
TO anon
USING (
  lower(trim(coalesce(status, ''))) IN ('published', 'approved')
);

COMMENT ON POLICY "articles_anon_select_published_only" ON public.articles IS
  '비로그인 anon 은 승인·게시된 기사만 조회. 송고/임시저장/반려 행은 노출 안 됨.';
