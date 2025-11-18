-- ================================================
-- Row Level Security (RLS) を有効化
-- ================================================
-- Lambda関数専用だが、セキュリティのためRLSを有効化
-- Lambda関数は service_role キーを使うため影響を受けない

-- 1. 全テーブルでRLSを有効化
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

-- 2. デフォルトポリシー：全てのアクセスを拒否
-- （service_role キーは RLS をバイパスするため、Lambda関数は影響を受けない）

-- ================================================
-- 確認クエリ
-- ================================================
-- RLSが有効になったことを確認

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('repositories', 'commits', 'weekly_activities', 'generated_reports', 'platform_stats')
ORDER BY tablename;

-- 期待される結果:
-- すべてのテーブルで rowsecurity = true
