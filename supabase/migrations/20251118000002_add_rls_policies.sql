-- ================================================
-- RLS ポリシーを追加
-- ================================================
-- "RLS Enabled No Policy" の Info を解消するため
-- 明示的に全拒否ポリシーを作成

-- 1. repositories テーブル
CREATE POLICY "service_role_full_access" ON repositories
  FOR ALL
  USING (auth.role() = 'service_role');

-- デフォルトで全拒否（service_role以外）
CREATE POLICY "deny_all_public_access" ON repositories
  FOR ALL
  USING (false);

-- 2. commits テーブル
CREATE POLICY "service_role_full_access" ON commits
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON commits
  FOR ALL
  USING (false);

-- 3. weekly_activities テーブル
CREATE POLICY "service_role_full_access" ON weekly_activities
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON weekly_activities
  FOR ALL
  USING (false);

-- 4. generated_reports テーブル
CREATE POLICY "service_role_full_access" ON generated_reports
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON generated_reports
  FOR ALL
  USING (false);

-- 5. platform_stats テーブル
CREATE POLICY "service_role_full_access" ON platform_stats
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "deny_all_public_access" ON platform_stats
  FOR ALL
  USING (false);

-- ================================================
-- 確認クエリ
-- ================================================
-- ポリシーが作成されたことを確認

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

-- 期待される結果:
-- 各テーブルに2つのポリシー（service_role_full_access, deny_all_public_access）
