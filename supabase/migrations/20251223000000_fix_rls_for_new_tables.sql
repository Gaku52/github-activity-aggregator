-- ================================================
-- Fix RLS for weekly_reports and daily_reports
-- ================================================
-- 作成日: 2025-12-23
-- 説明: weekly_reportsとdaily_reportsテーブルにRLSとポリシーを追加
-- ================================================

-- 1. weekly_reports テーブルでRLSを有効化
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- 2. daily_reports テーブルでRLSを有効化
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS ポリシーを追加
-- ================================================
-- service_role キーからのフルアクセスを許可
-- anon キーや認証されていないアクセスをブロック

-- 3. weekly_reports テーブルのポリシー
CREATE POLICY "service_role_full_access" ON weekly_reports
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON weekly_reports
  FOR ALL
  USING (false);

-- 4. daily_reports テーブルのポリシー
CREATE POLICY "service_role_full_access" ON daily_reports
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON daily_reports
  FOR ALL
  USING (false);

-- ================================================
-- 確認クエリ
-- ================================================
-- 新しいテーブルのRLSとポリシーが設定されたことを確認

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('weekly_reports', 'daily_reports')
ORDER BY tablename;

-- ポリシーの確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('weekly_reports', 'daily_reports')
ORDER BY tablename, policyname;

-- 期待される結果:
-- - weekly_reports と daily_reports で rowsecurity = true
-- - 各テーブルに2つのポリシー（service_role_full_access, deny_all_public_access）
