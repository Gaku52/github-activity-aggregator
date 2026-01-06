-- ================================================
-- セキュリティ問題の修正
-- ================================================
-- 作成日: 2026-01-06
-- 説明: Supabase Security Advisorで検出された問題を修正
-- 問題:
--   1. cost_tracking テーブルのRLSポリシーが全アクセス許可
--   2. daily_reports テーブルにRLSポリシーが未設定
--   3. weekly_reports テーブルにRLSポリシーが未設定（存在する場合）
-- ================================================

-- ================================================
-- 1. 危険なポリシーを削除
-- ================================================
-- cost_tracking マイグレーションで作成された危険なポリシーを削除

DROP POLICY IF EXISTS "Allow service key full access to claude_usage_history" ON claude_usage_history;
DROP POLICY IF EXISTS "Allow service key full access to credit_balance" ON credit_balance;
DROP POLICY IF EXISTS "Allow service key full access to cost_thresholds" ON cost_thresholds;

-- ================================================
-- 2. 正しいポリシーを作成
-- ================================================
-- service_role のみにフルアクセスを許可し、その他を拒否

-- claude_usage_history テーブル
-- ポリシー名の重複を避けるため、テーブル名を含める
CREATE POLICY "claude_usage_history_service_role_access" ON claude_usage_history
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "claude_usage_history_deny_public" ON claude_usage_history
  FOR ALL
  USING (false);

-- credit_balance テーブル
CREATE POLICY "credit_balance_service_role_access" ON credit_balance
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "credit_balance_deny_public" ON credit_balance
  FOR ALL
  USING (false);

-- cost_thresholds テーブル
CREATE POLICY "cost_thresholds_service_role_access" ON cost_thresholds
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "cost_thresholds_deny_public" ON cost_thresholds
  FOR ALL
  USING (false);

-- ================================================
-- 3. daily_reports テーブルのRLSを有効化
-- ================================================

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーがあれば削除してから作成
DROP POLICY IF EXISTS "service_role_full_access" ON daily_reports;
DROP POLICY IF EXISTS "deny_all_public_access" ON daily_reports;

CREATE POLICY "daily_reports_service_role_access" ON daily_reports
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "daily_reports_deny_public" ON daily_reports
  FOR ALL
  USING (false);

-- ================================================
-- 4. weekly_reports テーブルのRLSを有効化（存在する場合）
-- ================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'weekly_reports'
  ) THEN
    ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS "service_role_full_access" ON weekly_reports';
    EXECUTE 'DROP POLICY IF EXISTS "deny_all_public_access" ON weekly_reports';

    EXECUTE 'CREATE POLICY "weekly_reports_service_role_access" ON weekly_reports
      FOR ALL
      USING (auth.role() = ''service_role'')';

    EXECUTE 'CREATE POLICY "weekly_reports_deny_public" ON weekly_reports
      FOR ALL
      USING (false)';
  END IF;
END $$;

-- ================================================
-- 5. ビューのセキュリティ確認
-- ================================================
-- cost_tracking マイグレーションで作成されたビューのセキュリティを確認
-- ビューは SECURITY INVOKER に変更（すでに設定されていない場合）

DROP VIEW IF EXISTS daily_cost_summary;
CREATE OR REPLACE VIEW daily_cost_summary
WITH (security_invoker = on)
AS
SELECT
  DATE(timestamp) as date,
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_cost) as total_cost
FROM claude_usage_history
GROUP BY DATE(timestamp), model_id
ORDER BY date DESC, model_id;

DROP VIEW IF EXISTS monthly_cost_summary;
CREATE OR REPLACE VIEW monthly_cost_summary
WITH (security_invoker = on)
AS
SELECT
  DATE_TRUNC('month', timestamp) as month,
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_cost) as total_cost
FROM claude_usage_history
GROUP BY DATE_TRUNC('month', timestamp), model_id
ORDER BY month DESC, model_id;

DROP VIEW IF EXISTS current_month_usage;
CREATE OR REPLACE VIEW current_month_usage
WITH (security_invoker = on)
AS
SELECT
  DATE_TRUNC('month', CURRENT_TIMESTAMP) as month,
  SUM(total_cost) as total_cost,
  COUNT(*) as request_count
FROM claude_usage_history
WHERE DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_TIMESTAMP);

-- ================================================
-- 6. 確認クエリ
-- ================================================
-- 全テーブルのRLS状態とポリシーを確認

-- RLS有効化確認
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'repositories', 'commits', 'weekly_activities', 'generated_reports',
  'platform_stats', 'daily_reports', 'claude_usage_history',
  'credit_balance', 'cost_thresholds'
)
ORDER BY tablename;

-- ポリシー確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================
-- 修正完了
-- ================================================
-- 期待される結果:
-- 1. すべてのテーブルで rowsecurity = true
-- 2. 各テーブルに2つのポリシー（service_role_full_access, deny_all_public_access）
-- 3. ビューは SECURITY INVOKER モード
-- ================================================
