-- 기사 중복 방지 (Supabase): 앱 레벨에서도 짧은 시간·동일 기자·정규화 제목으로 차단함(NW_ARTICLE_DEDUPE_WINDOW_MS).
-- DB 제약은 "전역 UNIQUE(title)"처럼 과도한 규칙은 피하고, 멱등 키 또는 부분 유니크를 권장합니다.

-- 1) 권장: 클라이언트/서버가 동일 요청 재시도 시 같은 UUID를 보내면 DB에서 한 번만 삽입 가능
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS client_submission_id UUID NULL;

COMMENT ON COLUMN public.articles.client_submission_id IS '선택 멱등 키. 같은 값으로 두 번 insert 시 유니크 위반으로 차단.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_articles_client_submission_id
  ON public.articles (client_submission_id)
  WHERE client_submission_id IS NOT NULL;

-- 2) 선택: 전체 테이블에 UNIQUE(title) 단독 적용은 서로 다른 기사·같은 제목을 막으므로 일반적으로 비권장.
--    제목+기자+일 단위는 가능하지만 운영 정책과 맞는지 검토 후 적용하세요.
--
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_articles_author_title_day
--   ON public.articles (
--     author_id,
--     lower(btrim(title)),
--     (date_trunc('day', created_at AT TIME ZONE 'UTC'))
--   )
--   WHERE status IN ('submitted', 'published', 'pending', 'sent', 'approved');
