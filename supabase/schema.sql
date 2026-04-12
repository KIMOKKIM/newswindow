-- Supabase SQL Editor에서 실행 (또는 psql).
-- Storage: 대시보드에서 버킷 `banners` 생성 → Public bucket 으로 설정(광고 이미지 공개 URL용).

-- ━━━ users (관리자/기자/편집장) ━━━
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  userid TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  ssn TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ━━━ articles ━━━
CREATE TABLE IF NOT EXISTS public.articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  author_id BIGINT,
  author_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content1 TEXT NOT NULL DEFAULT '',
  content2 TEXT NOT NULL DEFAULT '',
  content3 TEXT NOT NULL DEFAULT '',
  content4 TEXT NOT NULL DEFAULT '',
  image1 TEXT NOT NULL DEFAULT '',
  image2 TEXT NOT NULL DEFAULT '',
  image3 TEXT NOT NULL DEFAULT '',
  image4 TEXT NOT NULL DEFAULT '',
  image1_caption TEXT NOT NULL DEFAULT '',
  image2_caption TEXT NOT NULL DEFAULT '',
  image3_caption TEXT NOT NULL DEFAULT '',
  image4_caption TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON public.articles (author_id);
-- 메인 피드: published 최신순·인기 구간 필터 (선택 적용, 운영 DB에서 ANALYZE 후 판단)
CREATE INDEX IF NOT EXISTS idx_articles_published_at_desc ON public.articles (published_at DESC NULLS LAST);
-- Home popular: status + published_at range, views sort (run ANALYZE after deploy)
CREATE INDEX IF NOT EXISTS idx_articles_status_pub_at_views ON public.articles (status, published_at DESC NULLS LAST, views DESC NULLS LAST);

-- Published-only list: trim huge data:image in image1 (smaller list/latest/home queries)
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


-- ━━━ 광고 레이아웃 JSON (기존 normalizeAdsResponse 구조 그대로 저장) ━━━
CREATE TABLE IF NOT EXISTS public.ad_site_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ad_site_config (id, config)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- ━━━ RLS (서버는 service_role 로 접근해 우회 — anon 은 막혀 있어도 무방) ━━━
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_site_config ENABLE ROW LEVEL SECURITY;

-- 익명(anon)은 users/ads 전면 거부. articles 는 게시(published/approved) 행만 SELECT 허가.
-- 백엔드 Express는 service_role 로 접속하므로 RLS 를 우회하고 전체 행 접근 가능.
CREATE POLICY "deny_all_anon_users" ON public.users FOR ALL USING (false);
CREATE POLICY "articles_anon_select_published_only"
ON public.articles
FOR SELECT
TO anon
USING (
  lower(trim(coalesce(status, ''))) IN ('published', 'approved')
);
CREATE POLICY "deny_all_anon_ads" ON public.ad_site_config FOR ALL USING (false);

COMMENT ON TABLE public.articles IS '기사 본문·이미지 URL (배너는 Supabase Storage public URL)';
COMMENT ON TABLE public.ad_site_config IS '메인 광고 슬롯 JSON; 이미지 src 는 Storage public URL 권장';
