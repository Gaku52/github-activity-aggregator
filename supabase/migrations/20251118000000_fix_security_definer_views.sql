-- ================================================
-- Security Definer View の問題を修正
-- ================================================
-- SECURITY DEFINER から SECURITY INVOKER に変更して
-- セキュリティアドバイザーの警告を解消

-- 既存のビューを削除して再作成（SECURITY INVOKER付き）

-- 1. 最新週のアクティビティサマリー
DROP VIEW IF EXISTS latest_week_summary;

CREATE OR REPLACE VIEW latest_week_summary
WITH (security_invoker = on)
AS
SELECT
  r.name AS repository_name,
  r.language,
  wa.week_start,
  wa.week_end,
  wa.commits_count,
  wa.lines_added,
  wa.lines_deleted,
  wa.files_changed,
  array_length(wa.contributors, 1) AS contributors_count
FROM weekly_activities wa
JOIN repositories r ON wa.repo_id = r.id
WHERE wa.week_start = (SELECT MAX(week_start) FROM weekly_activities)
ORDER BY wa.commits_count DESC;

COMMENT ON VIEW latest_week_summary IS '最新週のアクティビティをリポジトリ別に表示（SECURITY INVOKER）';

-- 2. 月次統計ビュー
DROP VIEW IF EXISTS monthly_stats;

CREATE OR REPLACE VIEW monthly_stats
WITH (security_invoker = on)
AS
SELECT
  DATE_TRUNC('month', wa.week_start) AS month,
  COUNT(DISTINCT wa.repo_id) AS active_repos,
  SUM(wa.commits_count) AS total_commits,
  SUM(wa.lines_added) AS total_additions,
  SUM(wa.lines_deleted) AS total_deletions
FROM weekly_activities wa
GROUP BY DATE_TRUNC('month', wa.week_start)
ORDER BY month DESC;

COMMENT ON VIEW monthly_stats IS '月次統計サマリー（SECURITY INVOKER）';
