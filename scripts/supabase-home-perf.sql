-- Run in Supabase SQL Editor (production) after review.
-- 1) Popular query index
CREATE INDEX IF NOT EXISTS idx_articles_status_pub_at_views
  ON public.articles (status, published_at DESC NULLS LAST, views DESC NULLS LAST);

-- 2) Slim published list: strips oversized data:image in image1 at read time (smaller PostgREST → API server)
-- Requires PostgreSQL 15+ for security_invoker; if ERROR, omit WITH line and use plain CREATE VIEW.
CREATE OR REPLACE VIEW public.articles_list_slim
WITH (security_invoker = true)
AS
SELECT
  id,
  title,
  category,
  author_name,
  created_at,
  published_at,
  submitted_at,
  updated_at,
  status,
  views,
  CASE
    WHEN image1 IS NULL OR btrim(image1) = '' THEN image1
    WHEN image1 LIKE 'data:%' AND length(image1) > 2600 THEN ''
    ELSE image1
  END AS image1
FROM public.articles
WHERE lower(trim(coalesce(status, ''))) IN ('published', 'approved');

ANALYZE public.articles;
