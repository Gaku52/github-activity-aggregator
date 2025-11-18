-- ================================================
-- Row Level Security (RLS) を完全に無効化
-- ================================================
-- Lambda関数専用のDBなので、RLSは不要
-- service_roleキーで全アクセスを許可

ALTER TABLE repositories DISABLE ROW LEVEL SECURITY;
ALTER TABLE commits DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('repositories', 'commits', 'weekly_activities', 'generated_reports', 'platform_stats');
